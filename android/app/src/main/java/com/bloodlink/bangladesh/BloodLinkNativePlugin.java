package com.bloodlink.bangladesh;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

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
}
