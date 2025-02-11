# 1. Flutter SDK가 포함된 베이스 이미지 선택 (여기서는 cirrusci/flutter 이미지를 사용)
FROM cirrusci/flutter:latest

# 2. 작업 디렉토리 설정 (컨테이너 내에서 소스 코드가 위치할 경로)
WORKDIR /app

# 3. Flutter 의존성 설치를 위해 pubspec 파일들을 먼저 복사
COPY pubspec.* ./

# 4. 의존성 설치 (캐시 활용)
RUN flutter pub get

# 5. 전체 소스 코드 복사
COPY . .

# 6. Flutter 웹 빌드 실행 (빌드 산출물은 /app/build/web 디렉토리에 생성됨)
RUN flutter build web

# 7. 컨테이너에서 웹 서버를 통해 빌드 산출물을 서빙하기 위해 포트 8080 개방
EXPOSE 8080

# 8. 간단한 HTTP 서버로 빌드 결과물을 서빙 (운영 환경에서는 Nginx, Apache 등을 사용하는 것이 좋음)
CMD ["python3", "-m", "http.server", "8080", "--directory", "build/web"]
