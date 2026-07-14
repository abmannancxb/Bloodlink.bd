package com.bloodlink.bangladesh;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.RemoteInput;

import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.FieldValue;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class NotificationActionReceiver extends BroadcastReceiver {
    private static final String TAG = "NotificationReceiver";

    public static final String ACTION_REPLY = "com.bloodlink.bangladesh.ACTION_REPLY";
    public static final String ACTION_MARK_READ = "com.bloodlink.bangladesh.ACTION_MARK_READ";
    public static final String ACTION_MUTE = "com.bloodlink.bangladesh.ACTION_MUTE";
    public static final String ACTION_ACCEPT_REQUEST = "com.bloodlink.bangladesh.ACTION_ACCEPT_REQUEST";
    public static final String ACTION_DECLINE_REQUEST = "com.bloodlink.bangladesh.ACTION_DECLINE_REQUEST";

    public static final String KEY_TEXT_REPLY = "key_text_reply";

    private void logDiagnostic(Context context, String type, String status, String title, String body, Map<String, String> payload, String action, String errorMessage) {
        try {
            FirebaseFirestore db = FirebaseFirestore.getInstance();
            Map<String, Object> log = new HashMap<>();
            log.put("timestamp", FieldValue.serverTimestamp());
            log.put("type", type);
            log.put("status", status);
            log.put("title", title != null ? title : "");
            log.put("body", body != null ? body : "");
            
            Map<String, Object> payloadMap = new HashMap<>();
            if (payload != null) {
                for (Map.Entry<String, String> entry : payload.entrySet()) {
                    payloadMap.put(entry.getKey(), entry.getValue());
                }
            }
            log.put("payload", payloadMap);
            log.put("action", action != null ? action : "");
            log.put("errorMessage", errorMessage != null ? errorMessage : "");

            // Device details
            Map<String, Object> device = new HashMap<>();
            device.put("manufacturer", android.os.Build.MANUFACTURER);
            device.put("model", android.os.Build.MODEL);
            device.put("osVersion", android.os.Build.VERSION.RELEASE);
            device.put("sdkVersion", android.os.Build.VERSION.SDK_INT);
            device.put("brand", android.os.Build.BRAND);
            device.put("hardware", android.os.Build.HARDWARE);
            log.put("device", device);

            db.collection("push_diagnostics")
                    .add(log)
                    .addOnSuccessListener(ref -> Log.d(TAG, "Diagnostic action log created: " + ref.getId()))
                    .addOnFailureListener(e -> Log.e(TAG, "Failed to write diagnostic action log: " + e.getMessage()));
        } catch (Exception e) {
            Log.e(TAG, "Exception writing diagnostic action log: " + e.getMessage());
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();
        int notificationId = intent.getIntExtra("notificationId", 0);
        Log.d(TAG, "Received action: " + action + ", notificationId: " + notificationId);

        // Prepare raw payload map from intent extras for diagnostics
        Map<String, String> payload = new HashMap<>();
        Bundle extras = intent.getExtras();
        if (extras != null) {
            for (String key : extras.keySet()) {
                Object val = extras.get(key);
                payload.put(key, val != null ? val.toString() : "null");
            }
        }

        // Log that action has been received/triggered
        logDiagnostic(context, "ACTION_TRIGGERED", "INFO", "Action triggered: " + action, "User clicked action button on notification.", payload, action, null);

        try {
            if (ACTION_REPLY.equals(action)) {
                handleReply(context, intent, notificationId, payload);
            } else if (ACTION_MARK_READ.equals(action)) {
                handleMarkRead(context, intent, notificationId, payload);
            } else if (ACTION_MUTE.equals(action)) {
                handleMute(context, intent, notificationId, payload);
            } else if (ACTION_ACCEPT_REQUEST.equals(action)) {
                handleAcceptRequest(context, intent, notificationId, payload);
            } else if (ACTION_DECLINE_REQUEST.equals(action)) {
                handleDeclineRequest(context, notificationId, payload);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in onReceive execution: ", e);
            logDiagnostic(context, "ACTION_FAILED", "FAILURE", "Action execution error", e.getMessage(), payload, action, e.toString());
        }
    }

    private void handleReply(Context context, Intent intent, int notificationId, Map<String, String> payload) {
        Bundle remoteInputResult = RemoteInput.getResultsFromIntent(intent);
        if (remoteInputResult == null) {
            logDiagnostic(context, "ACTION_REPLY", "FAILURE", "Reply Action Failed", "No remote input results found.", payload, ACTION_REPLY, "remoteInputResult is null");
            return;
        }

        CharSequence replyTextCharSeq = remoteInputResult.getCharSequence(KEY_TEXT_REPLY);
        if (replyTextCharSeq == null) {
            logDiagnostic(context, "ACTION_REPLY", "FAILURE", "Reply Action Failed", "Reply text is null.", payload, ACTION_REPLY, "replyTextCharSeq is null");
            return;
        }

        String replyText = replyTextCharSeq.toString().trim();
        String chatId = intent.getStringExtra("chatId");
        String senderId = intent.getStringExtra("senderId"); // the other user's id

        if (chatId == null || replyText.isEmpty()) {
            logDiagnostic(context, "ACTION_REPLY", "FAILURE", "Reply Action Failed", "Chat ID is null or reply text is empty.", payload, ACTION_REPLY, "chatId=" + chatId + ", textLength=" + replyText.length());
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences("BloodLinkPrefs", Context.MODE_PRIVATE);
        String myUid = prefs.getString("user_uid", null);

        if (myUid == null) {
            Log.e(TAG, "Cannot reply: myUid is null in SharedPreferences");
            logDiagnostic(context, "ACTION_REPLY", "FAILURE", "Reply Action Failed", "User is not logged in natively.", payload, ACTION_REPLY, "myUid is null in prefs");
            return;
        }

        // 1. Show dynamic progress/feedback in notification
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        NotificationCompat.Builder repliedNotification = new NotificationCompat.Builder(context, "bloodlink_high_importance_channel")
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle("Chat with Sender")
                .setContentText("Sending reply...")
                .setProgress(0, 0, true);

        try {
            notificationManager.notify(notificationId, repliedNotification.build());
        } catch (SecurityException e) {
            Log.e(TAG, "Notification permission missing for status update", e);
        }

        // 2. Add message to Firestore
        FirebaseFirestore db = FirebaseFirestore.getInstance();
        Map<String, Object> messageMap = new HashMap<>();
        messageMap.put("senderId", myUid);
        messageMap.put("text", replyText);
        messageMap.put("createdAt", FieldValue.serverTimestamp());
        messageMap.put("read", false);
        messageMap.put("type", "text");

        db.collection("chats")
                .document(chatId)
                .collection("messages")
                .add(messageMap)
                .addOnSuccessListener(documentReference -> {
                    Log.d(TAG, "Reply successfully added to Firestore chat: " + chatId);
                    logDiagnostic(context, "ACTION_REPLY", "SUCCESS", "Reply Sent", "Successfully sent message: " + replyText, payload, ACTION_REPLY, null);

                    // Update parent chat document
                    Map<String, Object> chatMap = new HashMap<>();
                    chatMap.put("lastMessage", replyText);
                    chatMap.put("lastMessageAt", FieldValue.serverTimestamp());
                    db.collection("chats").document(chatId).update(chatMap);

                    // Update notification to display success
                    NotificationCompat.Builder successNotification = new NotificationCompat.Builder(context, "bloodlink_high_importance_channel")
                            .setSmallIcon(R.drawable.ic_notification)
                            .setContentTitle("Chat Reply")
                            .setContentText("Reply sent successfully!")
                            .setTimeoutAfter(2000); // clear after 2 seconds

                    try {
                        notificationManager.notify(notificationId, successNotification.build());
                    } catch (SecurityException e) {
                        Log.e(TAG, "Notification permission missing", e);
                    }
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "Failed to send reply to Firestore", e);
                    logDiagnostic(context, "ACTION_REPLY", "FAILURE", "Reply Action Failed", "Failed to add reply to Firestore: " + e.getMessage(), payload, ACTION_REPLY, e.toString());
                    
                    NotificationCompat.Builder errorNotification = new NotificationCompat.Builder(context, "bloodlink_high_importance_channel")
                            .setSmallIcon(R.drawable.ic_notification)
                            .setContentTitle("Chat Reply")
                            .setContentText("Failed to send reply. Please try again.")
                            .setTimeoutAfter(3000);

                    try {
                        notificationManager.notify(notificationId, errorNotification.build());
                    } catch (SecurityException ex) {
                        Log.e(TAG, "Notification permission missing", ex);
                    }
                });
    }

    private void handleMarkRead(Context context, Intent intent, int notificationId, Map<String, String> payload) {
        String chatId = intent.getStringExtra("chatId");
        if (chatId == null) {
            logDiagnostic(context, "ACTION_MARK_READ", "FAILURE", "Mark Read Failed", "Chat ID is null.", payload, ACTION_MARK_READ, "chatId is null");
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences("BloodLinkPrefs", Context.MODE_PRIVATE);
        String myUid = prefs.getString("user_uid", null);

        if (myUid == null) {
            Log.e(TAG, "Cannot mark read: myUid is null");
            logDiagnostic(context, "ACTION_MARK_READ", "FAILURE", "Mark Read Failed", "User UID is null.", payload, ACTION_MARK_READ, "myUid is null");
            return;
        }

        FirebaseFirestore db = FirebaseFirestore.getInstance();
        db.collection("chats")
                .document(chatId)
                .update("unreadCount." + myUid, 0)
                .addOnSuccessListener(aVoid -> {
                    Log.d(TAG, "Chat unread count cleared for " + myUid);
                    logDiagnostic(context, "ACTION_MARK_READ", "SUCCESS", "Mark Read Succeeded", "Unread counts cleared in Firestore.", payload, ACTION_MARK_READ, null);
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "Failed to clear chat unread count", e);
                    logDiagnostic(context, "ACTION_MARK_READ", "FAILURE", "Mark Read Failed", "Firestore update failed: " + e.getMessage(), payload, ACTION_MARK_READ, e.toString());
                });

        // Dismiss the notification
        NotificationManagerCompat.from(context).cancel(notificationId);
    }

    private void handleMute(Context context, Intent intent, int notificationId, Map<String, String> payload) {
        String chatId = intent.getStringExtra("chatId");
        if (chatId == null) {
            logDiagnostic(context, "ACTION_MUTE", "FAILURE", "Mute Failed", "Chat ID is null.", payload, ACTION_MUTE, "chatId is null");
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences("BloodLinkPrefs", Context.MODE_PRIVATE);
        Set<String> mutedChats = new HashSet<>(prefs.getStringSet("muted_chats", new HashSet<>()));
        mutedChats.add(chatId);
        prefs.edit().putStringSet("muted_chats", mutedChats).apply();

        Log.d(TAG, "Chat " + chatId + " muted successfully.");
        logDiagnostic(context, "ACTION_MUTE", "SUCCESS", "Mute Succeeded", "Chat was added to muted set in SharedPreferences.", payload, ACTION_MUTE, null);

        // Dismiss the notification
        NotificationManagerCompat.from(context).cancel(notificationId);
    }

    private void handleAcceptRequest(Context context, Intent intent, int notificationId, Map<String, String> payload) {
        String requestId = intent.getStringExtra("requestId");
        if (requestId == null) {
            logDiagnostic(context, "ACTION_ACCEPT_REQUEST", "FAILURE", "Accept Request Failed", "Request ID is null.", payload, ACTION_ACCEPT_REQUEST, "requestId is null");
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences("BloodLinkPrefs", Context.MODE_PRIVATE);
        String myUid = prefs.getString("user_uid", null);
        String myDisplayName = prefs.getString("user_display_name", "Anonymous Donor");

        if (myUid == null) {
            Log.e(TAG, "Cannot accept request: myUid is null");
            logDiagnostic(context, "ACTION_ACCEPT_REQUEST", "FAILURE", "Accept Request Failed", "User UID is null in SharedPreferences.", payload, ACTION_ACCEPT_REQUEST, "myUid is null");
            return;
        }

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        NotificationCompat.Builder progressNotification = new NotificationCompat.Builder(context, "bloodlink_high_importance_channel")
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle("Blood Request")
                .setContentText("Accepting request...")
                .setProgress(0, 0, true);

        try {
            notificationManager.notify(notificationId, progressNotification.build());
        } catch (SecurityException e) {
            Log.e(TAG, "Notification permission missing", e);
        }

        FirebaseFirestore db = FirebaseFirestore.getInstance();
        Map<String, Object> updateMap = new HashMap<>();
        updateMap.put("status", "Fulfilled");
        updateMap.put("responderUid", myUid);
        updateMap.put("responderName", myDisplayName);
        updateMap.put("acceptedAt", FieldValue.serverTimestamp());

        db.collection("requests")
                .document(requestId)
                .update(updateMap)
                .addOnSuccessListener(aVoid -> {
                    Log.d(TAG, "Blood request accepted and marked as Fulfilled: " + requestId);
                    logDiagnostic(context, "ACTION_ACCEPT_REQUEST", "SUCCESS", "Request Accepted Succeeded", "Blood request is marked as Fulfilled in Firestore.", payload, ACTION_ACCEPT_REQUEST, null);
                    
                    NotificationCompat.Builder successNotification = new NotificationCompat.Builder(context, "bloodlink_high_importance_channel")
                            .setSmallIcon(R.drawable.ic_notification)
                            .setContentTitle("Blood Request")
                            .setContentText("You accepted this blood request! Marked as Fulfilled.")
                            .setTimeoutAfter(3000);

                    try {
                        notificationManager.notify(notificationId, successNotification.build());
                    } catch (SecurityException e) {
                        Log.e(TAG, "Notification permission missing", e);
                    }
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "Failed to accept blood request in Firestore", e);
                    logDiagnostic(context, "ACTION_ACCEPT_REQUEST", "FAILURE", "Accept Request Failed", "Firestore update failed: " + e.getMessage(), payload, ACTION_ACCEPT_REQUEST, e.toString());
                    
                    NotificationCompat.Builder errorNotification = new NotificationCompat.Builder(context, "bloodlink_high_importance_channel")
                            .setSmallIcon(R.drawable.ic_notification)
                            .setContentTitle("Blood Request")
                            .setContentText("Failed to accept blood request. Try in-app.")
                            .setTimeoutAfter(3000);

                    try {
                        notificationManager.notify(notificationId, errorNotification.build());
                    } catch (SecurityException ex) {
                        Log.e(TAG, "Notification permission missing", ex);
                    }
                });
    }

    private void handleDeclineRequest(Context context, int notificationId, Map<String, String> payload) {
        // Declining simply dismisses the heads-up notification, exactly like WhatsApp / Telegram
        NotificationManagerCompat.from(context).cancel(notificationId);
        Log.d(TAG, "Notification dismissed (declined)");
        logDiagnostic(context, "ACTION_DECLINE_REQUEST", "SUCCESS", "Decline Succeeded", "Notification dismissed by user.", payload, ACTION_DECLINE_REQUEST, null);
    }
}
