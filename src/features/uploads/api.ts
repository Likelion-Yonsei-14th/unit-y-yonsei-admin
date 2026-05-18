import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
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
  const presigned = await api.post<PresignedUrlDTO>('/admin/images/presigned-url', {
    domain,
    fileName: file.name,
    contentType: file.type,
    fileSize: file.size,
  });

  // S3 직접 PUT — api-client(공통 봉투·base URL)를 거치지 않는다.
  // presigned URL 이 content-type 을 서명에 포함하므로 헤더를 파일 타입과 일치시킨다.
  const res = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
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
