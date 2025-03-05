FROM ubuntu:latest

# 1. 기본 패키지 및 필수 도구 설치
RUN apt-get update && apt-get install -y \
    curl \
    git \
    unzip \
    xz-utils \
    zip \
    libglu1-mesa

# 2. Flutter SDK 다운로드 및 설치
RUN git clone https://github.com/flutter/flutter.git /usr/local/flutter
ENV PATH="/usr/local/flutter/bin:${PATH}"
RUN flutter doctor

# 3. 작업 디렉토리 설정
WORKDIR /app

# 4. pubspec 파일만 먼저 복사
COPY pubspec.* ./

# 5. 의존성 설치 (캐시 활용)
RUN flutter pub get

# 6. 전체 소스 코드 복사
COPY . .

# 7. 앱 빌드
RUN flutter build web

# 8. 웹 서버 설정
EXPOSE 8080
CMD ["flutter", "run", "-d", "web-server", "--web-port", "8080", "--web-hostname", "0.0.0.0"]
