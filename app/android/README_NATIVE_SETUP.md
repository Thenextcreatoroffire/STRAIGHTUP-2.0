# Native Android project not included here

This directory intentionally does **not** contain a full hand-written
`android/` Gradle project (the native Android Gradle project React Native
CLI normally generates). Hand-authoring a complete native Android project
(Gradle wrapper, `settings.gradle`, `build.gradle` files, `MainActivity`/
`MainApplication` Kotlin/Java sources, `AndroidManifest.xml`, resource
folders, autolinking config, etc.) outside of the official `react-native`
CLI generator is impractical and highly error-prone — small version
mismatches between the generator template and a hand-written tree are a
common source of native build failures that are very hard to debug.

All the actual application code (everything under `src/`, `App.tsx`,
`index.js`) is complete and ready to run. See `../README_APP.md` in the
project root for the exact steps to generate the missing native shell and
build the APK.
