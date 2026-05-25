import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { compressImage } from './compress';
import type { PresignedUrlDTO, UploadDomain } from './types';

/**
 * 이미지를 업로드하고 공개 URL을 반환한다.
 *
 * real: 백엔드에서 presigned URL 발급 → 그 URL 로 S3 에 직접 PUT → imageUrl 반환.
 * mock: 실제 업로드 없이 로컬 blob URL 반환 (미리보기 전용).
 *
 * 호출부는 비동기다 — 업로드 중 로딩 상태를 직접 다뤄야 한다.
 */
async function uploadImageReal(file: File, domain: UploadDomain): Promise<string> {
  // 압축은 반드시 presign "전" — presign 요청에 넘긴 fileSize·contentType 이 서명에
  // 박히므로, 압축 후 달라진 크기/타입으로 서명을 받아야 PUT 이 통과한다.
  const upload = await compressImage(file);

  const presigned = await api.post<PresignedUrlDTO>('/admin/images/presigned-url', {
    domain,
    fileName: upload.name,
    contentType: upload.type,
    fileSize: upload.size,
  });

  // 백엔드가 cacheControl 을 서명에 포함하므로, 누락되면 'Cache-Control: undefined' 가
  // 전송돼 서명 불일치(SignatureDoesNotMatch)로 실패한다. 사전에 검증해 원인이
  // 명확한 에러로 끊는다(백엔드 미배포/스펙 불일치 조기 발견).
  if (!presigned.cacheControl) {
    throw new Error(
      'presigned URL 응답에 cacheControl 이 없습니다. 백엔드 배포/스펙을 확인하세요.',
    );
  }

  // S3 직접 PUT — api-client(공통 봉투·base URL)를 거치지 않는다.
  // presigned URL 이 content-type·cache-control 을 서명에 포함하므로, 두 헤더를
  // 서명된 값과 **정확히 일치**시켜 보낸다. 한 글자라도 다르면 S3 가
  // SignatureDoesNotMatch 로 업로드를 거부한다.
  const res = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    body: upload,
    headers: {
      'Content-Type': upload.type,
      'Cache-Control': presigned.cacheControl,
    },
  });
  if (!res.ok) {
    throw new Error(`이미지 업로드에 실패했습니다 (S3 ${res.status})`);
  }

  return presigned.imageUrl;
}

async function uploadImageMock(file: File, _domain: UploadDomain): Promise<string> {
  await new Promise((r) => setTimeout(r, 200));
  return URL.createObjectURL(file);
}

export const uploadImage = env.USE_MOCK ? uploadImageMock : uploadImageReal;
