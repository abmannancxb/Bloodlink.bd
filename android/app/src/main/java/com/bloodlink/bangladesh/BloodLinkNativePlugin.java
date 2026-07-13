package com.bloodlink.bangladesh;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BloodLinkNative")
public class BloodLinkNativePlugin extends Plugin {
    private static final String TAG = "BloodLinkNativePlugin";

    @PluginMethod
    public void setAuthUser(PluginCall call) {
        String uid = call.getString("uid");
        String displayName = call.getString("displayName");
        String email = call.getString("email");

        if (uid == null) {
            call.reject("UID cannot be null");
            return;
        }

        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences("BloodLinkPrefs", Context.MODE_PRIVATE);
        prefs.edit()
                .putString("user_uid", uid)
                .putString("user_display_name", displayName != null ? displayName : "Anonymous Donor")
                .putString("user_email", email != null ? email : "")
                .apply();

        Log.d(TAG, "Auth user credentials synced to SharedPreferences: " + uid);
        JSObject ret = new JSObject();
        ret.put("status", "success");
        call.resolve(ret);
    }

    @PluginMethod
    public void muteChat(PluginCall call) {
        String chatId = call.getString("chatId");
        boolean mute = call.getBoolean("mute", true);

        if (chatId == null) {
            call.reject("Chat ID cannot be null");
            return;
        }

        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences("BloodLinkPrefs", Context.MODE_PRIVATE);
        java.util.Set<String> mutedChats = new java.util.HashSet<>(prefs.getStringSet("muted_chats", new java.util.HashSet<>()));
        if (mute) {
            mutedChats.add(chatId);
        } else {
            mutedChats.remove(chatId);
        }
        prefs.edit().putStringSet("muted_chats", mutedChats).apply();

        Log.d(TAG, "Chat mute state updated: " + chatId + " -> " + mute);
        JSObject ret = new JSObject();
        ret.put("status", "success");
        ret.put("isMuted", mute);
        call.resolve(ret);
    }

    @PluginMethod
    public void getInitialNotificationData(PluginCall call) {
        JSObject ret = new JSObject();
        if (getActivity() != null) {
            Intent intent = getActivity().getIntent();
            if (intent != null) {
                String chatId = intent.getStringExtra("chatId");
                String requestId = intent.getStringExtra("requestId");
                String type = intent.getStringExtra("type");

                if (chatId != null || requestId != null) {
                    ret.put("chatId", chatId);
                    ret.put("requestId", requestId);
                    ret.put("type", type);

                    // Clear the intent extras so we don't trigger routing multiple times
                    intent.removeExtra("chatId");
                    intent.removeExtra("requestId");
                    intent.removeExtra("type");

                    Log.d(TAG, "Retrieved initial notification payload: " + ret.toString());
                }
            }
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void showTestNotification(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }

        String title = call.getString("title", "Test Notification");
        String body = call.getString("body", "This is a local test notification from BloodLink Bangladesh.");

        String channelId = "bloodlink_high_importance_channel";

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "BloodLink Notifications",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Direct blood match notifications and messaging alerts");
            channel.enableLights(true);
            channel.setLightColor(Color.RED);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{100, 200, 300, 400, 500});

            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(context.getApplicationInfo().icon)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setShowWhen(true)
                .setWhen(System.currentTimeMillis())
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setColor(Color.RED);

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        try {
            notificationManager.notify((int) System.currentTimeMillis(), builder.build());
            JSObject ret = new JSObject();
            ret.put("status", "success");
            call.resolve(ret);
        } catch (SecurityException e) {
            Log.e(TAG, "Notification permission missing when publishing local test", e);
            call.reject("Permission missing: " + e.getMessage());
        }
    }
}
