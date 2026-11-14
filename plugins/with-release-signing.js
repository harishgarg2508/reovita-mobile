// Config plugin: signs release builds with a fixed keystore taken from environment variables.
// Local builds and builds without these variables keep the debug signing config.
// The keystore and passwords come from GitHub Actions secrets, so every CI build has the same SHA-1.
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_STORE_FILE = 'REOVITA_RELEASE_STORE_FILE';

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes(RELEASE_STORE_FILE)) return cfg;

    // 1. Add a release signing config that reads the keystore settings from the environment.
    gradle = gradle.replace(
      /signingConfigs \{\n/,
      `signingConfigs {
        release {
            if (System.getenv("${RELEASE_STORE_FILE}")) {
                storeFile file(System.getenv("${RELEASE_STORE_FILE}"))
                storePassword System.getenv("REOVITA_RELEASE_STORE_PASSWORD")
                keyAlias System.getenv("REOVITA_RELEASE_KEY_ALIAS")
                keyPassword System.getenv("REOVITA_RELEASE_KEY_PASSWORD")
            }
        }
`,
    );

    // 2. The release build type uses the release config when the keystore is provided, otherwise debug.
    gradle = gradle.replace(
      /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
      `$1signingConfig System.getenv("${RELEASE_STORE_FILE}") ? signingConfigs.release : signingConfigs.debug`,
    );

    cfg.modResults.contents = gradle;
    return cfg;
  });
};
