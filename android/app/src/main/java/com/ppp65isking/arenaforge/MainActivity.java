package com.ppp65isking.arenaforge;

import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;

import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	private static final String TAG = "ArenaForge";

	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		applyImmersiveMode();
		initPlayGames();
	}

	@Override
	public void onWindowFocusChanged(boolean hasFocus) {
		super.onWindowFocusChanged(hasFocus);
		if (hasFocus) {
			applyImmersiveMode();
		}
	}

	private void initPlayGames() {
		try {
			PlayGamesSdk.initialize(this);
			PlayGames.getGamesSignInClient(this)
				.isAuthenticated()
				.addOnCompleteListener(task -> {
					if (task.isSuccessful() && task.getResult().isAuthenticated()) {
						Log.i(TAG, "Play Games already authenticated");
						return;
					}

					PlayGames.getGamesSignInClient(this)
						.signIn()
						.addOnSuccessListener(unused -> Log.i(TAG, "Play Games sign-in success"))
						.addOnFailureListener(error -> Log.w(TAG, "Play Games sign-in failed", error));
				});
		} catch (Exception e) {
			Log.w(TAG, "Play Games initialization failed", e);
		}
	}

	private void applyImmersiveMode() {
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
			WindowInsetsController controller = getWindow().getInsetsController();
			if (controller != null) {
				controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
				controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
			}
		} else {
			View decorView = getWindow().getDecorView();
			decorView.setSystemUiVisibility(
				View.SYSTEM_UI_FLAG_FULLSCREEN
					| View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
					| View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
					| View.SYSTEM_UI_FLAG_LAYOUT_STABLE
					| View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
					| View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
			);
		}
	}
}
