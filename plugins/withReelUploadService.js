const { withAndroidManifest, withAppBuildGradle, withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function addPermission(manifest, permission) {
  const existing = (manifest['uses-permission'] || []).find(
    (p) => p.$['android:name'] === permission,
  );
  if (!existing) {
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    manifest['uses-permission'].push({ $: { 'android:name': permission } });
  }
  return manifest;
}

function addService(manifest) {
  const app = manifest.application[0];
  app.service = app.service || [];
  const exists = app.service.find(
    (s) => s.$['android:name'] === 'com.mahak2004.popliapp.reelupload.ReelUploadService',
  );
  if (!exists) {
    app.service.push({
      $: {
        'android:name': 'com.mahak2004.popliapp.reelupload.ReelUploadService',
        'android:exported': 'false',
        'android:foregroundServiceType': 'dataSync',
      },
    });
  }
  return manifest;
}

const withReelUploadManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    let manifest = config.modResults.manifest;
    manifest = addPermission(manifest, 'android.permission.FOREGROUND_SERVICE_DATA_SYNC');
    manifest = addService(manifest);
    config.modResults.manifest = manifest;
    return config;
  });
};

const withReelUploadGradle = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('androidx.work:work-runtime-ktx')) {
      return config;
    }
    config.modResults.contents = config.modResults.contents.replace(
      /dependencies\s*\{/,
      `dependencies {\n    implementation("androidx.work:work-runtime-ktx:2.9.0")\n    implementation("androidx.localbroadcastmanager:localbroadcastmanager:1.1.0")`,
    );
    return config;
  });
};

const withReelUploadMainApplication = (config) => {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes('ReelUploadPackage')) return config;

    contents = contents.replace(
      'import expo.modules.ExpoReactHostFactory',
      'import expo.modules.ExpoReactHostFactory\nimport com.mahak2004.popliapp.reelupload.ReelUploadPackage',
    );

    contents = contents.replace(
      'PackageList(this).packages.apply {',
      'PackageList(this).packages.apply {\n          add(ReelUploadPackage())',
    );

    config.modResults.contents = contents;
    return config;
  });
};

const withReelUploadKotlinFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const src = path.resolve(__dirname, '../modules/reel-upload');
      const dest = path.resolve(
        config.modRequest.platformProjectRoot,
        'app/src/main/java/com/mahak2004/popliapp/reelupload',
      );
      fs.mkdirSync(dest, { recursive: true });
      const files = fs.readdirSync(src).filter((f) => f.endsWith('.kt'));
      for (const file of files) {
        fs.copyFileSync(path.join(src, file), path.join(dest, file));
      }
      return config;
    },
  ]);
};

module.exports = function withReelUploadService(config) {
  config = withReelUploadManifest(config);
  config = withReelUploadGradle(config);
  config = withReelUploadMainApplication(config);
  config = withReelUploadKotlinFiles(config);
  return config;
};