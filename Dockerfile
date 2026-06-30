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

# Accept Android SDK licenses automatically
RUN yes | sdkmanager --licenses

# Install essential SDK components (platform-tools, platforms 34, build-tools 34)
# This matches Android compile version target
RUN sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# Set workspace directory
WORKDIR /app

# Copy package management files for clean npm installation
COPY package*.json ./

# Clean installation matching package-lock.json
RUN npm ci

# Copy the rest of the application files
COPY . .

# Run validation scripts by default (eslint + typescript typecheck)
CMD ["npm", "test"]
