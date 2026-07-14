package com.bloodlink.bangladesh;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.graphics.Color;
import android.os.Build;
import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String CHANNEL_ID = "bloodlink_high_importance_channel";
    private static final String CHANNEL_NAME = "BloodLink Notifications";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(BloodLinkNativePlugin.class);
        createNotificationChannel();
        registerHeadlessTaskRegistration();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }

    private void registerHeadlessTaskRegistration() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) { // Android 10 or upper
            android.util.Log.d("MainActivity", "Registering dedicated Headless task initialization on Android 10+");
            try {
                Intent headlessIntent = new Intent(this, MyFirebaseMessagingService.class);
                headlessIntent.setAction("com.bloodlink.bangladesh.INITIALIZE_HEADLESS");
                startService(headlessIntent);
            } catch (Exception e) {
                android.util.Log.e("MainActivity", "Failed to start headless service: " + e.getMessage());
            }
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
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
