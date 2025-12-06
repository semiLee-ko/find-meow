package com.findmeow.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import androidx.core.view.WindowCompat;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Enable edge-to-edge display (FALSE -> TRUE to respect system bars)
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
