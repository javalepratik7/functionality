# React Native Development Setup on Ubuntu 24.04 (Complete Guide)

Complete step-by-step guide to set up React Native development environment on a brand new Ubuntu 24.04 LTS PC.

---

## Prerequisites

- Fresh Ubuntu 24.04 LTS installation
- Internet connection
- ~25GB free disk space (for Android Studio + SDK)
- Admin access (sudo)

---

## Step 1: Update Ubuntu System

Always start with a clean system update.

```bash
sudo apt update
sudo apt upgrade -y
```

This updates all system packages to latest versions. Takes 5-10 minutes depending on your internet speed.

---

## Step 2: Install Required Dependencies

Install build essentials and other required libraries:

```bash
sudo apt install -y \
  build-essential \
  curl \
  wget \
  git \
  python3 \
  python3-pip \
  libssl-dev \
  libffi-dev
```

Verify installation:

```bash
gcc --version
git --version
python3 --version
```

---

## Step 3: Install Node.js using NVM

NVM (Node Version Manager) allows you to manage multiple Node.js versions. This is the **recommended approach**.

### 3.1 Install NVM

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

This downloads and installs NVM to your home directory.

### 3.2 Load NVM into current shell

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### 3.3 Reload bashrc to persist NVM

```bash
source ~/.bashrc
```

### 3.4 Verify NVM installation

```bash
nvm --version
```

Expected output: `v0.40.3` (or similar)

### 3.5 Install Node.js LTS

```bash
nvm install --lts
```

This installs the latest LTS (Long Term Support) version of Node.js.

### 3.6 Set default Node version

```bash
nvm use --lts
```

### 3.7 Verify Node.js and npm

```bash
node -v
npm -v
```

Expected output:
```
v20.x.x (or v22.x.x)
10.x.x (or 11.x.x)
```

---

## Step 4: Install Java JDK 17

React Native requires Java 17 for Android development.

### 4.1 Install OpenJDK 17

```bash
sudo apt install -y openjdk-17-jdk openjdk-17-jre
```

### 4.2 Verify Java installation

```bash
java -version
javac -version
```

Expected output:
```
openjdk version "17.x.x"
```

### 4.3 Check Java location

```bash
readlink -f $(which javac)
```

Output example:
```
/usr/lib/jvm/java-17-openjdk-amd64/bin/javac
```

### 4.4 Set JAVA_HOME environment variable

Open bashrc file:

```bash
nano ~/.bashrc
```

Add these lines at the end of the file:

```bash
# Java Configuration
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
```

Save file (Ctrl+O, Enter, Ctrl+X).

Reload bashrc:

```bash
source ~/.bashrc
```

Verify:

```bash
echo $JAVA_HOME
```

Expected output:
```
/usr/lib/jvm/java-17-openjdk-amd64
```

---

## Step 5: Install Watchman (Optional but Recommended)

Watchman improves file watching performance on large projects.

```bash
sudo apt install -y watchman
```

Verify:

```bash
watchman --version
```

---

## Step 6: Install Android Studio

### 6.1 Install via Snap

```bash
sudo snap install android-studio --classic
```

This may take 10-15 minutes as it downloads ~1GB of data.

### 6.2 Launch Android Studio

```bash
android-studio
```

The application will open. Complete the initial setup wizard.

---

## Step 7: Configure Android SDK

### 7.1 Open SDK Manager in Android Studio

Inside Android Studio:
- Click on "More Actions" (bottom of startup screen)
- Select "SDK Manager"

### 7.2 Install Required SDK Components

In SDK Manager, ensure these are installed:

**Under "SDK Platforms" tab:**
- Android 14 (or latest) - API Level 34
- Android 13 - API Level 33
- Android 12 - API Level 31 (minimum recommended)

**Under "SDK Tools" tab:**
- Android SDK Build-Tools (latest)
- Android SDK Platform-Tools
- Android Emulator
- Android SDK Command-line Tools (latest)
- Google Play Services
- Intel x86 Emulator Accelerator (if using x86 emulator)

**Under "NDK (Side by side)" tab:**
- NDK (latest version)

Click "Apply" and wait for downloads to complete (5-15 minutes depending on internet).

---

## Step 8: Configure Android Environment Variables

### 8.1 Find Android SDK location

By default, Android SDK is installed at:
```
$HOME/Android/Sdk
```

Verify:
```bash
ls -la ~/Android/Sdk
```

### 8.2 Add Android environment variables

Open bashrc:

```bash
nano ~/.bashrc
```

Add these lines at the end:

```bash
# Android Configuration
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME

# Add to PATH
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Save and reload:

```bash
source ~/.bashrc
```

### 8.3 Verify Android configuration

```bash
echo $ANDROID_HOME
```

Expected output:
```
/home/YOUR_USERNAME/Android/Sdk
```

Verify ADB:

```bash
adb version
```

Expected output:
```
Android Debug Bridge version x.x.x
```

Verify sdkmanager:

```bash
sdkmanager --version
```

---

## Step 9: Install Android Emulator (Optional)

If you want to test on an emulator instead of physical device:

### 9.1 Open Device Manager in Android Studio

- Click "More Actions" in Android Studio
- Select "Device Manager"
- Click "Create Device"

### 9.2 Create Virtual Device

- Select device type (e.g., Pixel 5)
- Select Android version (Android 13 or higher recommended)
- Click "Finish"

### 9.3 Start Emulator

In Device Manager, click the "Play" button next to your device.

Verify in terminal:

```bash
adb devices
```

Expected output:
```
emulator-5554     device
```

---

## Step 10: Install ADB Tools for Wireless Debugging

For physical device testing over WiFi:

```bash
sudo apt install -y android-tools-adb android-tools-fastboot
```

Verify:

```bash
adb version
```

---

## Step 11: Create Your First React Native App

### 11.1 Choose location for your project

```bash
mkdir -p ~/Development/ReactNative
cd ~/Development/ReactNative
```

### 11.2 Create new React Native project

```bash
npx @react-native-community/cli init MyFirstApp
```

OR for latest React Native (v0.86+):

```bash
npx react-native init MyFirstApp
```

This creates a new project and installs dependencies. Takes 5-10 minutes.

### 11.3 Navigate to project

```bash
cd MyFirstApp
```

### 11.4 Verify project structure

```bash
ls -la
```

You should see:
- `App.tsx` or `App.js` - Main app component
- `android/` - Android native code
- `ios/` - iOS native code (not used on Ubuntu)
- `node_modules/` - Dependencies
- `package.json` - Project configuration

---

## Step 12: Verify React Native Environment

### 12.1 Check React Native version

```bash
npx react-native --version
```

Expected output:
```
0.86.x (or latest)
```

### 12.2 Run React Native Doctor

```bash
npx react-native doctor
```

This checks your entire setup and reports any issues.

Expected output (all should be green/checkmark):
```
✓ Node
✓ JDK
✓ Android SDK
✓ Gradlew
✓ Android Studio
```

If any fails, follow the doctor's recommendations to fix.

---

## Step 13: Setup Physical Device (Wireless Debugging)

### 13.1 Enable Developer Mode on Phone

- Open Settings
- Go to "About Phone"
- Tap "Build Number" 7 times rapidly
- Go back to Settings

### 13.2 Enable Wireless Debugging

- Settings → Developer Options
- Toggle "Wireless Debugging" ON
- Tap "Wireless Debugging"
- Tap "Pair new device"
- Note the IP address and port number (e.g., `192.168.1.100:36452`)
- Note the pairing code (6 digits)

### 13.3 Pair Device from Ubuntu

```bash
adb pair 192.168.1.100:36452
```

Replace with your phone's IP and port from Step 13.2.

When prompted, enter the 6-digit pairing code from your phone.

Expected output:
```
Successfully paired to 192.168.1.100:36452
```

### 13.4 Connect Device

```bash
adb connect 192.168.1.100:5555
```

(Note: Connect port is usually 5555, different from pair port)

### 13.5 Verify Connection

```bash
adb devices
```

Expected output:
```
192.168.1.100:5555    device
```

---

## Step 14: Run Your React Native App

### 14.1 Terminal 1 - Start Metro Bundler

Metro is the JavaScript bundler. Keep this running while developing.

```bash
cd ~/Development/ReactNative/MyFirstApp
npx react-native start
```

Expected output:
```
┃ Metro waiting on exp://...
┃ Scan the QR code above with Expo Go
```

Leave this running and do NOT close the terminal.

### 14.2 Terminal 2 - Run App on Device

Open a new terminal and run:

```bash
cd ~/Development/ReactNative/MyFirstApp
npx react-native run-android
```

This will:
1. Build the Android app
2. Install APK on connected device
3. Launch the app automatically

First build takes 3-5 minutes. Subsequent builds are faster.

**Success:** You should see your app on your physical device!

---

## Step 15: Modify and Test Hot Reload

### 15.1 Edit App

Open `App.tsx` or `App.js` in your editor:

```bash
nano App.tsx
```

Change the text in the JSX to something like:

```jsx
<Text style={styles.sectionTitle}>Hello React Native! 🚀</Text>
```

Save (Ctrl+O, Enter, Ctrl+X).

### 15.2 See Changes on Device

The app will automatically reload on your device (watch Metro terminal for reload logs).

**Congratulations! You have hot reload working!**

---

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `npx react-native start` | Start Metro bundler |
| `npx react-native run-android` | Build & run on device/emulator |
| `npm install <package>` | Install new package |
| `cd android && ./gradlew clean && cd ..` | Clean Android build |
| `npx react-native doctor` | Check environment setup |
| `adb devices` | List connected devices |
| `adb logcat` | View Android logs |
| `npx react-native start --reset-cache` | Reset Metro cache |
| `adb kill-server && adb start-server` | Restart ADB daemon |

---

## Troubleshooting

### Issue 1: "javac not found"

**Cause:** JAVA_HOME not set correctly

**Solution:**
```bash
echo $JAVA_HOME
# Should output: /usr/lib/jvm/java-17-openjdk-amd64

# If not set, reload bashrc:
source ~/.bashrc
```

---

### Issue 2: "ANDROID_HOME not found"

**Cause:** Android environment variables not set

**Solution:**
```bash
echo $ANDROID_HOME
# Should output: /home/YOUR_USERNAME/Android/Sdk

# Verify Android SDK exists:
ls -la ~/Android/Sdk

# If not, set in bashrc and reload:
source ~/.bashrc
```

---

### Issue 3: "adb devices shows no devices"

**Cause:** Device not connected or driver issue

**Solution:**

For wireless device:
```bash
# Verify WiFi connection between PC and phone
ping 192.168.1.100  # Use your phone's IP

# Restart ADB
adb kill-server
adb start-server

# Reconnect
adb connect 192.168.1.100:5555
adb devices
```

For emulator:
```bash
# Start emulator from Android Studio → Device Manager

# Check if running:
adb devices

# If not showing, restart ADB:
adb kill-server
adb start-server
```

---

### Issue 4: "Gradle build failed"

**Cause:** Android build cache corrupted

**Solution:**
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

---

### Issue 5: "Metro port 8081 already in use"

**Cause:** Metro already running or another app using port

**Solution:**
```bash
# Find process using port 8081
lsof -i :8081

# Kill the process
kill -9 <PID>

# Or start Metro on different port:
npx react-native start --port 8082
```

---

### Issue 6: "Build failed: SDK not found"

**Cause:** Android SDK components missing

**Solution:**
```bash
# List available SDK packages
sdkmanager --list

# Install specific package
sdkmanager "platforms;android-34"

# Or use Android Studio GUI: More Actions → SDK Manager
```

---

### Issue 7: "React Native Doctor shows Java 21, but need Java 17"

**Cause:** Multiple Java versions installed

**Solution:**
```bash
# Check installed Java versions
update-alternatives --list java
update-alternatives --list javac

# Select Java 17
sudo update-alternatives --config java
sudo update-alternatives --config javac

# Verify
java -version
```

---

### Issue 8: "App installs but doesn't launch"

**Cause:** Missing permissions or device settings

**Solution:**

On your Android device:
1. Settings → Apps → MyFirstApp → Permissions
2. Enable all requested permissions
3. Go back and force stop the app
4. Re-run: `npx react-native run-android`

---

### Issue 9: "Cannot connect to Metro bundler"

**Cause:** Metro running on different port or device can't reach PC

**Solution:**
```bash
# Check PC's local IP
hostname -I

# On device, open React Native settings (shake phone)
# Set "Debug server host for device" to: <YOUR_IP>:8081

# Example:
# 192.168.1.50:8081
```

---

### Issue 10: "node_modules issues or missing dependencies"

**Cause:** Incomplete npm installation

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Clean Android build
cd android
./gradlew clean
cd ..

# Rebuild
npx react-native run-android
```

---

## System Specifications (Recommended)

For smooth React Native development:

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | Intel i5 / AMD Ryzen 5 | Intel i7 / AMD Ryzen 7 |
| RAM | 8GB | 16GB+ |
| Storage | 25GB | 50GB+ (SSD) |
| Internet | 2 Mbps | 10 Mbps+ |

---

## Next Steps

After successfully running your app:

1. **Learn React Native Basics**
   - Explore `App.tsx` component
   - Read official docs: https://reactnative.dev/docs/getting-started

2. **Install Useful Dependencies**
   ```bash
   npm install react-navigation
   npm install react-native-gesture-handler
   npm install axios
   ```

3. **Setup Version Control**
   ```bash
   cd ~/Development/ReactNative/MyFirstApp
   git init
   git add .
   git commit -m "Initial React Native project"
   ```

4. **Use a Code Editor**
   - Install VS Code: `sudo snap install code --classic`
   - Install React Native Tools extension

5. **Join Communities**
   - React Native Discord
   - Stack Overflow
   - GitHub Discussions

---

## Frequently Asked Questions

**Q: Do I need Android Studio?**
A: Technically you only need Android SDK, but Android Studio includes it and makes management easier. Recommended for beginners.

**Q: Can I use iOS on Ubuntu?**
A: No. iOS development requires macOS. Ubuntu supports Android development only.

**Q: How often should I update?**
A: Update React Native monthly, Android SDK quarterly, Node.js as LTS updates arrive.

**Q: Is emulator or physical device better?**
A: Physical device for real-world testing. Emulator for quick testing without phone. Use both.

**Q: Can I develop without Android Studio?**
A: Yes, but you need Android SDK CLI tools. Android Studio GUI is easier for beginners.

---

## Summary Checklist

- [ ] Ubuntu updated
- [ ] Node.js and npm installed
- [ ] Java 17 installed with JAVA_HOME set
- [ ] Android Studio installed
- [ ] Android SDK components installed
- [ ] ANDROID_HOME environment variable set
- [ ] ADB tools installed
- [ ] Physical device paired (or emulator created)
- [ ] React Native app created
- [ ] App successfully runs on device
- [ ] Hot reload working
- [ ] Can modify code and see changes

**Once all checked, you're ready to develop React Native apps on Ubuntu!** 🎉

---

## Additional Resources

- Official React Native Docs: https://reactnative.dev
- Android Development: https://developer.android.com
- React Native Community: https://reactnative.dev/community/overview
- Expo (Alternative easier setup): https://expo.dev

---

**Last Updated:** July 2026
**Ubuntu Version:** 24.04 LTS
**React Native Version:** 0.86+
**Node.js Version:** LTS (20.x+)
