# Use Node.js 20 base image (Debian-based)
FROM node:20-bullseye-slim

# Set environment variables for non-interactive installs
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies (Java 17, wget, unzip, git)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jdk-headless \
    wget \
    unzip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set up Android SDK path variables
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=${PATH}:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools

# Download and install Android SDK command-line tools
RUN mkdir -p ${ANDROID_HOME}/cmdline-tools \
    && wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/cmdline-tools.zip \
    && unzip -q /tmp/cmdline-tools.zip -d ${ANDROID_HOME}/cmdline-tools \
    && mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest \
    && rm /tmp/cmdline-tools.zip

# Accept Android SDK licenses automatically (pre-seed known license hashes & run sdkmanager)
RUN mkdir -p ${ANDROID_HOME}/licenses \
    && echo "24333f8a63b6825ea9c5514f83c2829b004d1fee\n8933bad161af4178b1185d1a37fbf41ea5269c55\nd56f5187479451eabf01fb78af6dfcb131a6481e" > ${ANDROID_HOME}/licenses/android-sdk-license \
    && echo "84831b9409646a918e30573bab4c9c91346d8abd\n504667f4cd4ae7fed3a36382fdfd2b51ac65d4b5" > ${ANDROID_HOME}/licenses/android-sdk-preview-license \
    && (yes || true) | sdkmanager --licenses

# Install essential SDK components (platform-tools, platforms 34, build-tools 34)
RUN (yes || true) | sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# Set workspace directory
WORKDIR /app

# Copy root package files and install root dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy the rest of the application files
COPY . .

# Run validation scripts by default (eslint + typescript typecheck)
CMD ["npm", "test"]
