const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Sets android:allowBackup="false" in AndroidManifest.xml so local SQLite financial cache
 * is excluded from Android Auto Backup / Google Drive backups.
 */
module.exports = function withAndroidNoBackup(config) {
  return withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    if (app?.$) {
      app.$["android:allowBackup"] = "false";
    }
    return mod;
  });
};
