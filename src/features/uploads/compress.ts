import imageCompression from 'browser-image-compression';

/**
 * 업로드 전 이미지를 webp 로 리사이즈·압축한다.
 *
 * egress 절감의 핵심 — 원본(최대 5MB) 대신 1600px·webp·~0.4MB 로 줄여 목록·상세
 * 모든 조회의 전송량을 ~5배 낮춘다. 라이브러리가 EXIF orientation(휴대폰 세로 사진)
 * 보정과 webp 인코딩을 처리한다.
 *
 * 파일명 확장자도 `.webp` 로 정규화한다 — 백엔드가 확장자↔콘텐츠타입 일치
 * (`validateExtensionAndContentType`)를 검사하므로 둘이 어긋나면 거부된다.
 */
const COMPRESSION_OPTIONS = {
  /** 목표 용량(MB). 품질을 반복 조정해 근접시킨다. */
  maxSizeMB: 0.4,
  /** 긴 변 최대 px — 목록·상세 모두 커버. */
  maxWidthOrHeight: 1600,
  fileType: 'image/webp' as const,
  initialQuality: 0.8,
  useWebWorker: true,
};

export async function compressImage(file: File): Promise<File> {
  const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
  const webpName = file.name.replace(/\.[^.]+$/, '') + '.webp';
  return new File([compressed], webpName, { type: 'image/webp' });
}
