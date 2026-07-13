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

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();
        int notificationId = intent.getIntExtra("notificationId", 0);
        Log.d(TAG, "Received action: " + action + ", notificationId: " + notificationId);

        if (ACTION_REPLY.equals(action)) {
            handleReply(context, intent, notificationId);
        } else if (ACTION_MARK_READ.equals(action)) {
            handleMarkRead(context, intent, notificationId);
        } else if (ACTION_MUTE.equals(action)) {
            handleMute(context, intent, notificationId);
        } else if (ACTION_ACCEPT_REQUEST.equals(action)) {
            handleAcceptRequest(context, intent, notificationId);
        } else if (ACTION_DECLINE_REQUEST.equals(action)) {
            handleDeclineRequest(context, notificationId);
        }
    }

    private void handleReply(Context context, Intent intent, int notificationId) {
        Bundle remoteInputResult = RemoteInput.getResultsFromIntent(intent);
        if (remoteInputResult == null) return;

        CharSequence replyTextCharSeq = remoteInputResult.getCharSequence(KEY_TEXT_REPLY);
        if (replyTextCharSeq == null) return;

        String replyText = replyTextCharSeq.toString().trim();
        String chatId = intent.getStringExtra("chatId");
        String senderId = intent.getStringExtra("senderId"); // the other user's id

        if (chatId == null || replyText.isEmpty()) return;

        SharedPreferences prefs = context.getSharedPreferences("BloodLinkPrefs", Context.MODE_PRIVATE);
        String myUid = prefs.getString("user_uid", null);

        if (myUid == null) {
            Log.e(TAG, "Cannot reply: myUid is null in SharedPreferences");
            return;
        }

        // 1. Show dynamic progress/feedback in notification
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        NotificationCompat.Builder repliedNotification = new NotificationCompat.Builder(context, "bloodlink_high_importance_channel")
                .setSmallIcon(R.mipmap.ic_launcher)
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

                    // Update parent chat document
                    Map<String, Object> chatMap = new HashMap<>();
                    chatMap.put("lastMessage", replyText);
                    chatMap.put("lastMessageAt", FieldValue.serverTimestamp());
                    db.collection("chats").document(chatId).update(chatMap);

                    // Update notification to display success
                    NotificationCompat.Builder successNotification = new NotificationCompat.Builder(context, "bloodlink_high_importance_channel")
                            .setSmallIcon(R.mipmap.ic_launcher)
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
                    NotificationCompat.Builder errorNotification = new NotificationCompat.Builder(context, "bloodlink_high_importance_channel")
                            .setSmallIcon(R.mipmap.ic_launcher)
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

    private void handleMarkRead(Context context, Intent intent, int notificationId) {
        String chatId = intent.getStringExtra("chatId");
        if (chatId == null) return;

        SharedPreferences prefs = context.getSharedPreferences("BloodLinkPrefs", Context.MODE_PRIVATE);
        String myUid = prefs.getString("user_uid", null);

        if (myUid == null) {
            Log.e(TAG, "Cannot mark read: myUid is null");
            return;
        }

        FirebaseFirestore db = FirebaseFirestore.getInstance();
        db.collection("chats")
                .document(chatId)
                .update("unreadCount." + myUid, 0)
                .addOnSuccessListener(aVoid -> Log.d(TAG, "Chat unread count cleared for " + myUid))
                .addOnFailureListener(e -> Log.e(TAG, "Failed to clear chat unread count", e));

        // Dismiss the notification
        NotificationManagerCompat.from(context).cancel(notificationId);
    }

    private void handleMute(Context context, Intent intent, int notificationId) {
        String chatId = intent.getStringExtra("chatId");
        if (chatId == null) return;

        SharedPreferences prefs = context.getSharedPreferences("BloodLinkPrefs", Context.MODE_PRIVATE);
        Set<String> mutedChats = new HashSet<>(prefs.getStringSet("muted_chats", new HashSet<>()));
        mutedChats.add(chatId);
        prefs.edit().putStringSet("muted_chats", mutedChats).apply();

        Log.d(TAG, "Chat " + chatId + " muted successfully.");

        // Dismiss the notification
        NotificationManagerCompat.from(context).cancel(notificationId);
    }

    private void handleAcceptRequest(Context context, Intent intent, int notificationId) {
        String requestId = intent.getStringExtra("requestId");
        if (requestId == null) return;

        SharedPreferences prefs = context.getSharedPreferences("BloodLinkPrefs", Context.MODE_PRIVATE);
        String myUid = prefs.getString("user_uid", null);
        String myDisplayName = prefs.getString("user_display_name", "Anonymous Donor");

        if (myUid == null) {
            Log.e(TAG, "Cannot accept request: myUid is null");
            return;
        }

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        NotificationCompat.Builder progressNotification = new NotificationCompat.Builder(context, "bloodlink_high_importance_channel")
                .setSmallIcon(R.mipmap.ic_launcher)
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
                    NotificationCompat.Builder successNotification = new NotificationCompat.Builder(context, "bloodlink_high_importance_channel")
                            .setSmallIcon(R.mipmap.ic_launcher)
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
                    NotificationCompat.Builder errorNotification = new NotificationCompat.Builder(context, "bloodlink_high_importance_channel")
                            .setSmallIcon(R.mipmap.ic_launcher)
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

    private void handleDeclineRequest(Context context, int notificationId) {
        // Declining simply dismisses the heads-up notification, exactly like WhatsApp / Telegram
        NotificationManagerCompat.from(context).cancel(notificationId);
        Log.d(TAG, "Notification dismissed (declined)");
    }
}
