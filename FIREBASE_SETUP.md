# Firebase 초기 설정 가이드

이 가이드는 Firebase를 처음 사용하는 분들을 위해 프로젝트 생성부터 앱 연동까지의 과정을 단계별로 설명합니다.

## 1. Firebase 프로젝트 생성
1. [Firebase 콘솔](https://console.firebase.google.com/)에 접속하여 로그인합니다.
2. **"프로젝트 추가"**를 클릭합니다.
3. 프로젝트 이름을 입력하고 (예: `my-todo-app`) 안내에 따라 생성합니다. (Google 애널리틱스는 선택 사항입니다.)

## 2. 웹 앱 등록 및 키 확인
1. 프로젝트 대시보드 중앙의 **웹 아이콘 (</>)**을 클릭합니다.
2. 앱 별칭을 입력하고 **"앱 등록"**을 클릭합니다.
3. 화면에 나타나는 `firebaseConfig` 객체 안의 값들을 확인합니다. 이 값들이 `.env` 파일에 들어갈 내용입니다.
   - `apiKey`, `authDomain`, `projectId` 등

## 3. Firebase 서비스 활성화

### A. Authentication (로그인 기능)
1. 왼쪽 메뉴에서 **빌드 > Authentication**으로 이동합니다.
2. **"시작하기"**를 누릅니다.
3. **Sign-in method** 탭에서 **"새 제공업체 추가"**를 누르고 **"Google"**을 선택합니다.
4. **"사용 설정"**을 체크하고 프로젝트 지원 이메일을 선택한 후 **"저장"**합니다.

### B. Firestore Database (데이터 저장)
1. 왼쪽 메뉴에서 **빌드 > Firestore Database**로 이동합니다.
2. **"데이터베이스 만들기"**를 클릭합니다.
3. 위치를 선택(기본값 권장)하고 **"테스트 모드에서 시작"**을 선택하여 초기 권한 문제를 피합니다. (나중에 보안 규칙을 강화할 수 있습니다.)
4. **"만들기"**를 완료합니다.

## 4. .env 파일 작성
프로젝트 루트 폴더에 `.env` 파일을 만들고(이미 `.env.example`이 있다면 복사), 2번 단계에서 확인한 값을 입력합니다.

```env
VITE_FIREBASE_API_KEY=your_apiKey
VITE_FIREBASE_AUTH_DOMAIN=your_authDomain
VITE_FIREBASE_PROJECT_ID=your_projectId
VITE_FIREBASE_STORAGE_BUCKET=your_storageBucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messagingSenderId
VITE_FIREBASE_APP_ID=your_appId
```

## 6. 데이터 저장/조회가 안 될 때 (중요!)

로그인은 성공했으나 리스트가 나타나지 않거나 추가가 안 된다면 다음 두 가지를 확인해야 합니다.

### A. Firestore 보안 규칙 설정
Firestore는 기본적으로 외부 쓰기를 차단합니다. 테스트를 위해 권한을 열어주어야 합니다.
1. Firebase 콘솔 > Firestore Database > **규칙(Rules)** 탭으로 이동합니다.
2. 내용을 다음으로 교체하고 **게시**를 누릅니다.
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /todos/{todoId} {
      // 로그인한 사용자만 본인의 데이터를 읽고 쓸 수 있음
      allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null;
    }
  }
}
```
*(또는 테스트를 위해 `allow read, write: if true;`로 설정할 수 있으나, 보안상 위 규칙을 권장합니다.)*

### B. Firestore 인덱스 생성
복합 쿼리(내 꺼만 가져오기 + 정렬하기)를 사용하므로 인덱스가 필요합니다.
1. 브라우저에서 서비스 페이지를 열고 **F12(개발자 도구)**를 누릅니다.
2. **Console** 탭을 확인합니다.
3. `The query requires an index. You can create it here: https://console.firebase.google.com/...` 인터의 링크가 있다면 클릭하여 자동으로 인덱스를 생성해 주세요.
4. 인덱스 생성에는 약 1~3분 정도 걸립니다.
