package com.bloodlink.bangladesh;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.RemoteInput;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.FieldValue;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashSet;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "MyFirebaseMsgService";
    private static final String CHANNEL_ID = "bloodlink_high_importance_channel";
    private static final String CHANNEL_NAME = "BloodLink Notifications";

    private void logDiagnostic(String type, String status, String title, String body, Map<String, String> payload, String action, String errorMessage) {
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
                    .addOnSuccessListener(ref -> Log.d(TAG, "Diagnostic log created: " + ref.getId()))
                    .addOnFailureListener(e -> Log.e(TAG, "Failed to write diagnostic log: " + e.getMessage()));
        } catch (Exception e) {
            Log.e(TAG, "Exception writing diagnostic log: " + e.getMessage());
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "Refreshed token: " + token);
        // Save token to SharedPreferences so the app can retrieve it or upload it if needed
        getSharedPreferences("BloodLinkPrefs", MODE_PRIVATE)
                .edit()
                .putString("fcm_token", token)
                .apply();
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        try {
            super.onMessageReceived(remoteMessage);
            Log.d(TAG, "From: " + remoteMessage.getFrom());

            // Extract payload from either message notification or data
            Map<String, String> data = remoteMessage.getData();
            String title = null;
            String body = null;
            String type = "general";
            String chatId = null;
            String requestId = null;
            String senderId = null;
            String senderName = null;
            String largeIconUrl = null;

            if (data != null && !data.isEmpty()) {
                Log.d(TAG, "Message data payload: " + data.toString());
                title = data.get("title");
                body = data.get("body");
                type = data.get("type"); // "chat" or "blood_request"
                chatId = data.get("chatId");
                requestId = data.get("requestId");
                senderId = data.get("senderId");
                senderName = data.get("senderName");
                largeIconUrl = data.get("largeIcon");
            }

            // Fallback to notification block if data is empty
            if (title == null && remoteMessage.getNotification() != null) {
                title = remoteMessage.getNotification().getTitle();
                body = remoteMessage.getNotification().getBody();
            }

            if (title == null) {
                title = "BloodLink Bangladesh";
            }
            if (body == null) {
                body = "You have a new update.";
            }

            // Log successful arrival
            logDiagnostic("RECEIVE", "SUCCESS", title, body, data, null, null);

            // Check if chat is muted
            if ("chat".equals(type) && chatId != null) {
                SharedPreferences prefs = getSharedPreferences("BloodLinkPrefs", MODE_PRIVATE);
                Set<String> mutedChats = prefs.getStringSet("muted_chats", new HashSet<>());
                if (mutedChats.contains(chatId)) {
                    Log.d(TAG, "Notification silenced: Chat " + chatId + " is muted.");
                    logDiagnostic("RECEIVE", "INFO", title, body, data, "SILENCED_MUTED", "Notification was received but silenced because this chat is muted.");
                    return;
                }
            }

            sendNotification(title, body, type, chatId, requestId, senderId, senderName, largeIconUrl, data);
        } catch (Exception e) {
            Log.e(TAG, "Error processing incoming message: ", e);
            Map<String, String> errPayload = new HashMap<>();
            if (remoteMessage.getData() != null) {
                errPayload.putAll(remoteMessage.getData());
            }
            logDiagnostic("RECEIVE_FAILED", "FAILURE", "Failed to Process Notification", e.getMessage(), errPayload, null, e.toString());
        }
    }

    private void sendNotification(String title, String body, String type, String chatId, String requestId, String senderId, String senderName, String largeIconUrl, Map<String, String> data) {
        int notificationId = (chatId != null ? chatId.hashCode() : (requestId != null ? requestId.hashCode() : (int) System.currentTimeMillis()));

        // Intent to open MainActivity on tapping
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        openIntent.putExtra("chatId", chatId);
        openIntent.putExtra("requestId", requestId);
        openIntent.putExtra("type", type);

        PendingIntent openPendingIntent = PendingIntent.getActivity(
                this,
                notificationId,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Build notification
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setShowWhen(true)
                .setWhen(System.currentTimeMillis())
                .setPriority(NotificationCompat.PRIORITY_MAX) // Heads-up display maximum priority
                .setCategory(NotificationCompat.CATEGORY_MESSAGE) // Message category (like WhatsApp)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC) // Visible on lock screen
                .setContentIntent(openPendingIntent)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setColor(Color.RED);

        // Get large icon if available
        if (largeIconUrl != null && !largeIconUrl.isEmpty()) {
            Bitmap largeIcon = getBitmapFromUrl(largeIconUrl);
            if (largeIcon != null) {
                builder.setLargeIcon(largeIcon);
            }
        }

        // Add action buttons based on notification type
        if ("chat".equals(type) && chatId != null) {
            // Direct Reply Action
            RemoteInput remoteInput = new RemoteInput.Builder(NotificationActionReceiver.KEY_TEXT_REPLY)
                    .setLabel("Reply to " + (senderName != null ? senderName : "Sender") + "...")
                    .build();

            Intent replyIntent = new Intent(this, NotificationActionReceiver.class);
            replyIntent.setAction(NotificationActionReceiver.ACTION_REPLY);
            replyIntent.putExtra("chatId", chatId);
            replyIntent.putExtra("senderId", senderId);
            replyIntent.putExtra("notificationId", notificationId);

            PendingIntent replyPendingIntent = PendingIntent.getBroadcast(
                    this,
                    notificationId + 10,
                    replyIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
            );

            NotificationCompat.Action replyAction = new NotificationCompat.Action.Builder(
                    0,
                    "Reply",
                    replyPendingIntent
            ).addRemoteInput(remoteInput).build();

            // Mark as Read Action
            Intent markReadIntent = new Intent(this, NotificationActionReceiver.class);
            markReadIntent.setAction(NotificationActionReceiver.ACTION_MARK_READ);
            markReadIntent.putExtra("chatId", chatId);
            markReadIntent.putExtra("notificationId", notificationId);

            PendingIntent markReadPendingIntent = PendingIntent.getBroadcast(
                    this,
                    notificationId + 20,
                    markReadIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Action markReadAction = new NotificationCompat.Action.Builder(
                    0,
                    "Mark as Read",
                    markReadPendingIntent
            ).build();

            // Mute Action
            Intent muteIntent = new Intent(this, NotificationActionReceiver.class);
            muteIntent.setAction(NotificationActionReceiver.ACTION_MUTE);
            muteIntent.putExtra("chatId", chatId);
            muteIntent.putExtra("notificationId", notificationId);

            PendingIntent mutePendingIntent = PendingIntent.getBroadcast(
                    this,
                    notificationId + 30,
                    muteIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Action muteAction = new NotificationCompat.Action.Builder(
                    0,
                    "Mute",
                    mutePendingIntent
            ).build();

            builder.addAction(replyAction);
            builder.addAction(markReadAction);
            builder.addAction(muteAction);

        } else if ("blood_request".equals(type) && requestId != null) {
            // Accept Blood Request Action
            Intent acceptIntent = new Intent(this, NotificationActionReceiver.class);
            acceptIntent.setAction(NotificationActionReceiver.ACTION_ACCEPT_REQUEST);
            acceptIntent.putExtra("requestId", requestId);
            acceptIntent.putExtra("notificationId", notificationId);

            PendingIntent acceptPendingIntent = PendingIntent.getBroadcast(
                    this,
                    notificationId + 40,
                    acceptIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Action acceptAction = new NotificationCompat.Action.Builder(
                    0,
                    "Accept",
                    acceptPendingIntent
            ).build();

            // Decline Blood Request Action
            Intent declineIntent = new Intent(this, NotificationActionReceiver.class);
            declineIntent.setAction(NotificationActionReceiver.ACTION_DECLINE_REQUEST);
            declineIntent.putExtra("requestId", requestId);
            declineIntent.putExtra("notificationId", notificationId);

            PendingIntent declinePendingIntent = PendingIntent.getBroadcast(
                    this,
                    notificationId + 50,
                    declineIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Action declineAction = new NotificationCompat.Action.Builder(
                    0,
                    "Decline",
                    declinePendingIntent
            ).build();

            builder.addAction(acceptAction);
            builder.addAction(declineAction);
        }

        // Handle Grouping
        String groupKey = "com.bloodlink.bangladesh." + (type != null ? type.toUpperCase() : "GENERAL") + "_GROUP";
        builder.setGroup(groupKey);

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
        try {
            // Show main notification
            notificationManager.notify(notificationId, builder.build());

            // Show group summary
            NotificationCompat.Builder summaryBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle("chat".equals(type) ? "New Messages" : "Blood Link Alerts")
                    .setContentText("chat".equals(type) ? "You have unread chats" : "New requests matching your profile")
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setGroup(groupKey)
                    .setGroupSummary(true)
                    .setAutoCancel(true)
                    .setColor(Color.RED);

            notificationManager.notify(groupKey.hashCode(), summaryBuilder.build());
        } catch (SecurityException e) {
            Log.e(TAG, "Notification permission missing when publishing", e);
            logDiagnostic("NOTIFICATION_ERROR", "FAILURE", title, body, data, null, "Permission missing: " + e.getMessage());
        }
    }

    private Bitmap getBitmapFromUrl(String imageUrl) {
        try {
            URL url = new URL(imageUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setDoInput(true);
            connection.connect();
            InputStream input = connection.getInputStream();
            return BitmapFactory.decodeStream(input);
        } catch (Exception e) {
            Log.e(TAG, "Error downloading large icon bitmap: " + e.getMessage());
            return null;
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH // required for heads-up
            );
            channel.setDescription("Direct blood match notifications and messaging alerts");
            channel.enableLights(true);
            channel.setLightColor(Color.RED);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{100, 200, 300, 400, 500});
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            channel.setShowBadge(true);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
