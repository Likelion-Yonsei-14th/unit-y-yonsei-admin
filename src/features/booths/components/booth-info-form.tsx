import { useEffect, useState } from 'react';
import { Check, Edit, Megaphone, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { UseMutationResult } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Booth, BoothSector, BoothStatus } from '@/features/booths/types';
import { BOOTH_STATUS_LABEL } from '@/features/booths/types';
import {
  useAddBoothImage,
  useBoothImages,
  useDeleteBoothImage,
  useUpdateBoothImage,
} from '@/features/booths/hooks';
import { uploadImage } from '@/features/uploads/api';
import { ApiError } from '@/lib/api-client';

const SECTORS: BoothSector[] = ['한글탑', '백양로', '송도'];
const STATUSES: BoothStatus[] = ['OPEN', 'PREPARING', 'CLOSED'];
/**
 * 부스 운영 가능 일차 — 2~4일차(5/27~5/29)만. 1일차(5/26 블루런)는 부스가 없다.
 * 백엔드 FestivalDayService 의 일차 정의(2=5/27, 3=5/28, 4=5/29)와 동일 체계.
 */
const FESTIVAL_DAYS: { value: number; label: string }[] = [
  { value: 2, label: '2일차 (5/27 · 국제캠)' },
  { value: 3, label: '3일차 (5/28 · 신촌캠)' },
  { value: 4, label: '4일차 (5/29 · 신촌캠)' },
];

/** Booth.date 정수 → 사람이 읽는 일차 라벨. 매칭 없으면 'N일차' 로 폴백. */
const festivalDayLabel = (day: number): string =>
  FESTIVAL_DAYS.find((d) => d.value === day)?.label ?? `${day}일차`;

/** 운영 시간 기본값 — 대부분 부스가 17~22시 운영이라 미입력 시 프리필해 둔다. */
const DEFAULT_OPEN_TIME = '17:00';
const DEFAULT_CLOSE_TIME = '22:00';

/**
 * 일차별 선택 가능 구역. 2일차=국제캠(송도), 3·4일차=신촌캠(한글탑/백양로).
 * 일차 미선택 시엔 전체를 열어 둔다.
 */
function sectorsForDay(day: number | null): BoothSector[] {
  if (day === 2) return ['송도'];
  if (day === 3 || day === 4) return ['한글탑', '백양로'];
  return SECTORS;
}

/** 필수 입력 항목 표시. 작성완료(profileComplete)에 필요한 필드 라벨에 붙인다. */
function RequiredMark() {
  return (
    <span className="ml-0.5 text-destructive" aria-hidden="true">
      *
    </span>
  );
}

/**
 * '진짜 미작성' 부스 판별 — 부스 운영자가 아직 한 번도 프로필을 저장하지 않은 상태.
 * profileComplete 만으로는 isFood(체험/음식)를 이미 저장해둔 미완성 부스의 값까지 덮으므로
 * (Copilot 리뷰), 운영자가 입력하는 핵심 필드가 전부 비어있을 때만 미작성으로 본다.
 * name·date·sector·location 은 어드민이 부스 생성 시 미리 지정할 수 있어 신호에서 제외.
 */
function isBoothUntouched(b: Booth): boolean {
  return (
    !b.profileComplete &&
    !b.organization &&
    !b.description &&
    !b.openTime &&
    !b.closeTime &&
    !b.account &&
    !b.instagram &&
    b.representativeMenus.length === 0 &&
    b.tags.length === 0
  );
}

interface Props {
  booth: Booth;
  /** 부스 운영 ON/OFF 토글 — 페이지 헤더와 폼이 같은 값을 가리키므로 controlled. */
  isReservable: boolean;
  onIsReservableChange: (next: boolean) => void;
  initiallyEditing: boolean;
  /** 부스 mutation 인스턴스. 페이지에서 useUpdateMyBooth() 로 생성해 내려준다. */
  updateMutation: UseMutationResult<Booth, Error, Booth>;
  /** 저장 성공 시 호출 — 페이지가 카드 화면으로 복귀시켜 작성완료 상태를 바로 보여준다. */
  onSaved: () => void;
}

const inputClass =
  'w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all';
const readonlyClass = 'w-full px-4 py-3 border border-border rounded-lg bg-muted text-foreground';

/**
 * 운영 시간 입력 — 24시간제 시(00–23) + 10분 단위 분(00·10·…·50) 드롭다운.
 * 네이티브 `<input type="time">` 는 브라우저 로케일(ko-KR)에서 오전/오후로 렌더돼 헷갈려서
 * 로케일에 안 휘둘리도록 select 로 직접 구성. 값은 그대로 "HH:mm" 문자열.
 */
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTE_OPTIONS = ['00', '10', '20', '30', '40', '50'];

function TimeSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [hour = '', minute = ''] = value.split(':');
  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        id={id}
        value={hour}
        onChange={(e) => onChange(`${e.target.value}:${minute || '00'}`)}
        className={inputClass}
        aria-label="시"
      >
        {HOUR_OPTIONS.map((h) => (
          <option key={h} value={h}>
            {h}시
          </option>
        ))}
      </select>
      <select
        value={minute}
        onChange={(e) => onChange(`${hour || '00'}:${e.target.value}`)}
        className={inputClass}
        aria-label="분"
      >
        {MINUTE_OPTIONS.map((m) => (
          <option key={m} value={m}>
            {m}분
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * 부스 이미지 관리 — 기존 부스(boothId 있음)에서만 노출. 대표 + 추가 이미지를 모두
 * booth_images 컬렉션 하나에서 다룬다(백엔드 정본).
 *
 * - 대표 이미지 = display_order=1 행. BoothResponse.thumbnailUrl 이 이 행에서 파생되므로,
 *   대표 교체/제거는 Booth 본체 PUT(thumbnailUrl 필드 없음)이 아니라 이 컬렉션의
 *   PATCH/POST/DELETE 로만 반영된다.
 * - 추가 이미지 = display_order≥2. 1은 대표로 예약해 둔다.
 *
 * 업로드는 uploadImage(file,'booth') → S3 URL → 이미지 CRUD 로 URL 참조만 저장.
 * displayOrder 중복(백엔드 409)에 견고하도록 add/update/delete 실패는 토스트로만 처리한다.
 */
function BoothImageGallery({ boothId, editable }: { boothId: number; editable: boolean }) {
  const { data: images, isPending, isError } = useBoothImages(boothId);
  const addImage = useAddBoothImage();
  const updateImage = useUpdateBoothImage();
  const deleteImage = useDeleteBoothImage();
  const [isUploading, setIsUploading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // 대표 = display_order=1 행(백엔드 thumbnailUrl 의 정본). 추가 갤러리는 그 외(≥2).
  const primary = (images ?? []).find((img) => img.displayOrder === 1) ?? null;
  const extras = (images ?? []).filter((img) => img.displayOrder !== 1);

  // 대표 이미지 교체/추가 — display_order=1 행을 PATCH(있으면) 또는 POST(없으면).
  const handlePrimarySelect = async (file: File | null) => {
    if (!file) return;
    setIsUploading(true);
    let imageUrl: string;
    try {
      imageUrl = await uploadImage(file, 'booth');
    } catch {
      toast.error('이미지 업로드에 실패했습니다.');
      setIsUploading(false);
      return;
    }
    const callbacks = {
      onSuccess: () => toast.success('대표 이미지를 저장했습니다.'),
      onError: () => toast.error('대표 이미지 저장에 실패했습니다. 잠시 후 다시 시도해주세요.'),
      onSettled: () => setIsUploading(false),
    };
    if (primary) {
      updateImage.mutate({ boothId, imageId: primary.id, patch: { imageUrl } }, callbacks);
    } else {
      addImage.mutate({ boothId, input: { imageUrl, displayOrder: 1 } }, callbacks);
    }
  };

  const handleAddFiles = async (fileList: FileList | null) => {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) return;
    // 업로드(S3) + add mutation(URL 저장) 전체 배치가 끝날 때까지 잠금을 유지한다.
    setIsUploading(true);
    // 베이스 = max(2, 현재 최대 + 1). display_order=1(대표)은 건드리지 않는다.
    // 파일마다 성공·실패와 무관하게 1씩 전진시켜 UNIQUE(booth_id, display_order) 충돌(409)·
    // 연쇄 실패를 피한다. images 는 mutation 중 refetch 돼도 이 클로저에선 안 바뀌므로 로컬 증가.
    let nextOrder = Math.max(
      2,
      (images ?? []).reduce((max, img) => Math.max(max, img.displayOrder), 0) + 1,
    );
    let added = 0;
    let failed = 0;
    for (const file of files) {
      const order = nextOrder;
      nextOrder += 1;
      try {
        const imageUrl = await uploadImage(file, 'booth');
        await addImage.mutateAsync({ boothId, input: { imageUrl, displayOrder: order } });
        added += 1;
      } catch {
        failed += 1;
      }
    }
    setIsUploading(false);
    if (added > 0) toast.success(`이미지 ${added}장을 추가했습니다.`);
    if (failed > 0)
      toast.error(`이미지 ${failed}장 추가에 실패했습니다. 잠시 후 다시 시도해주세요.`);
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteId === null) return;
    const imageId = pendingDeleteId;
    deleteImage.mutate(
      { boothId, imageId },
      {
        onSuccess: () => toast.success('이미지를 삭제했습니다.'),
        onError: () => toast.error('이미지 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.'),
        onSettled: () => setPendingDeleteId(null),
      },
    );
  };

  if (isPending) {
    return (
      <div className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground text-sm">
        이미지를 불러오는 중…
      </div>
    );
  }
  if (isError) {
    return (
      <div className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground text-sm">
        이미지를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 대표 이미지 — display_order=1 (방문객 앱 부스 목록/상세 상단 노출) */}
      <div>
        <span className="block text-sm font-semibold text-foreground mb-2">부스 대표 이미지</span>
        <p className="mb-3 text-xs text-muted-foreground">
          방문객용 앱 부스 목록·상세 상단에 노출되는 대표 이미지입니다.
        </p>
        {primary ? (
          <div className="space-y-2">
            <div className="aspect-[3/2] w-full max-w-sm rounded-lg overflow-hidden border border-border">
              <img
                src={primary.imageUrl}
                alt="부스 대표 이미지"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            {editable && (
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-ds-border-strong transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploading}
                    className="hidden"
                    onChange={(e) => {
                      handlePrimarySelect(e.target.files?.[0] ?? null);
                      e.target.value = '';
                    }}
                  />
                  <Edit size={14} />
                  {isUploading ? '업로드 중…' : '이미지 교체'}
                </label>
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(primary.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-ds-border-strong transition-colors"
                >
                  <X size={14} />
                  제거
                </button>
              </div>
            )}
          </div>
        ) : editable ? (
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-ds-border-strong transition-colors">
            <input
              type="file"
              accept="image/*"
              disabled={isUploading}
              className="hidden"
              onChange={(e) => {
                handlePrimarySelect(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
            <Plus size={16} />
            {isUploading ? '업로드 중…' : '대표 이미지 추가'}
          </label>
        ) : (
          <div className="w-full max-w-sm px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground text-sm">
            등록된 대표 이미지가 없습니다.
          </div>
        )}
      </div>

      {/* 추가 이미지 — display_order≥2 */}
      <div>
        <span className="block text-sm font-semibold text-foreground mb-2">부스 추가 이미지</span>
        <p className="mb-3 text-xs text-muted-foreground">
          대표 이미지 외에 방문객용 앱 부스 상세에 함께 노출할 이미지입니다.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {extras.map((img) => (
            <div
              key={img.id}
              className="relative aspect-[3/2] rounded-lg overflow-hidden border border-border group"
            >
              <img
                src={img.imageUrl}
                alt="부스 이미지"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
              {editable && (
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(img.id)}
                  aria-label="이미지 삭제"
                  className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-8 h-8 rounded-full bg-background/90 text-destructive shadow-md hover:bg-background transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}

          {editable && (
            <label className="aspect-[3/2] flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-ds-border-strong transition-colors cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={isUploading}
                className="hidden"
                onChange={(e) => {
                  handleAddFiles(e.target.files);
                  // 같은 파일 재선택도 onChange 가 다시 뜨도록 초기화.
                  e.target.value = '';
                }}
              />
              <Plus size={20} />
              {isUploading ? '업로드 중…' : '이미지 추가 (여러 장 가능)'}
            </label>
          )}

          {!editable && extras.length === 0 && (
            <div className="col-span-full w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground text-sm">
              등록된 추가 이미지가 없습니다.
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이미지를 삭제하시겠어요?</AlertDialogTitle>
            <AlertDialogDescription>삭제한 이미지는 되돌릴 수 없습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={deleteImage.isPending}>
              {deleteImage.isPending ? '삭제 중…' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * 부스 상세 정보 편집 폼.
 * 자체 state 로 편집 중 Booth 전체를 들고 있고, 외부 booth refetch 시 다시 hydrate.
 * 저장은 편집 중 Booth 전체를 PUT(전체 교체)으로 전송한다.
 */
export function BoothInfoForm({
  booth,
  isReservable,
  onIsReservableChange,
  initiallyEditing,
  updateMutation,
  onSaved,
}: Props) {
  const [isEditing, setIsEditing] = useState(initiallyEditing);
  const [name, setName] = useState(booth.name);
  const [organization, setOrganization] = useState(booth.organization);
  const [description, setDescription] = useState(booth.description);
  const [notice, setNotice] = useState(booth.notice ?? '');
  const [date, setDate] = useState<number | null>(booth.date);
  const [openTime, setOpenTime] = useState(booth.openTime ?? DEFAULT_OPEN_TIME);
  const [closeTime, setCloseTime] = useState(booth.closeTime ?? DEFAULT_CLOSE_TIME);
  const [sector, setSector] = useState<BoothSector | null>(booth.sector);
  const [location, setLocation] = useState(booth.location);
  const [status, setStatus] = useState<BoothStatus>(booth.status);
  // 대동제 부스 대부분이 주점(음식·주류 판매)이라, 운영자가 한 번도 작성 안 한 부스는
  // '음식 부스'(주점)를 기본 선택으로 둔다. 저장값이 있는 부스는 booth.isFood 를 그대로 반영.
  const [isFood, setIsFood] = useState(isBoothUntouched(booth) ? true : booth.isFood);
  // 푸드트럭(외부 업체 운영)은 음식 부스의 하위 구분(isFood=true 전제). 저장값 그대로 —
  // 미작성 부스는 음식 부스(주점, isFoodTruck=false)가 기본이라 booth.isFoodTruck(=false) 로 충분.
  const [isFoodTruck, setIsFoodTruck] = useState(booth.isFoodTruck);
  const [instagram, setInstagram] = useState(booth.instagram);
  const [account, setAccount] = useState(booth.account);
  // 대표 메뉴는 쉼표 구분 텍스트 입력. 편집 중 자유로운 쉼표/공백 입력을 위해
  // raw 문자열을 그대로 들고 있다가 저장 시점에만 string[] 로 파싱한다.
  const [representativeMenusRaw, setRepresentativeMenusRaw] = useState(
    booth.representativeMenus.join(', '),
  );
  const [tags, setTags] = useState<string[]>(booth.tags);

  // 서버 데이터로 다시 채워질 때 form state 를 다시 hydrate.
  useEffect(() => {
    setName(booth.name);
    setOrganization(booth.organization);
    setDescription(booth.description);
    setNotice(booth.notice ?? '');
    setDate(booth.date);
    setOpenTime(booth.openTime ?? DEFAULT_OPEN_TIME);
    setCloseTime(booth.closeTime ?? DEFAULT_CLOSE_TIME);
    setSector(booth.sector);
    setLocation(booth.location);
    setStatus(booth.status);
    setIsFood(isBoothUntouched(booth) ? true : booth.isFood);
    setIsFoodTruck(booth.isFoodTruck);
    setInstagram(booth.instagram);
    setAccount(booth.account);
    setRepresentativeMenusRaw(booth.representativeMenus.join(', '));
    setTags(booth.tags);
  }, [booth]);

  // 일차 변경 시 구역 정합 — 2일차(국제캠)는 송도 강제, 3·4일차에서 송도였으면 해제.
  const handleDateChange = (raw: string) => {
    const nextDate = raw ? Number(raw) : null;
    setDate(nextDate);
    if (nextDate === 2) {
      setSector('송도');
    } else if (sector && !sectorsForDay(nextDate).includes(sector)) {
      setSector(null);
    }
  };

  const handleSave = () => {
    const parsedMenus = representativeMenusRaw
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    // 대표 메뉴/체험명은 부스 종류와 무관하게 최대 3개까지만 등록한다. 초과 시 저장 차단.
    if (parsedMenus.length > 3) {
      toast.error('최대 3개까지만 입력할 수 있습니다.');
      return;
    }
    // 먹거리 부스의 '부스 태그' 는 태그당 5글자 이내. 초과 시 저장 차단.
    if (isFood && parsedMenus.some((tag) => tag.length > 5)) {
      toast.error('부스 태그는 태그당 5글자 이내로 입력해주세요.');
      return;
    }
    const next: Booth = {
      ...booth,
      name,
      organization,
      description,
      notice: notice.trim() || null,
      date,
      openTime: openTime || null,
      closeTime: closeTime || null,
      sector,
      location,
      status,
      isFood,
      isFoodTruck,
      instagram,
      account,
      isReservable,
      representativeMenus: parsedMenus,
      tags,
    };
    updateMutation.mutate(next, {
      onSuccess: () => {
        setIsEditing(false);
        toast.success('부스 정보를 저장했습니다.');
        // 카드 화면으로 복귀 — 갱신된 작성완료 상태를 바로 보여준다.
        onSaved();
      },
      onError: (err) => {
        // 서버가 준 구체 사유(중복 이름·검증 실패 등)를 그대로 노출 — 운영진이 무엇을
        // 고쳐야 하는지 알 수 있게. performance-list 의 삭제 onError 와 동일 패턴.
        const message =
          err instanceof ApiError && err.message
            ? err.message
            : '저장에 실패했습니다. 잠시 후 다시 시도해주세요.';
        toast.error(message);
      },
    });
  };

  return (
    <div className="bg-background rounded-2xl p-4 md:p-8 mb-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-xl font-bold text-foreground">부스 상세 정보</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed transition-colors duration-200"
          >
            <Edit size={18} />
            편집
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Check size={18} />
            {updateMutation.isPending ? '저장 중…' : '저장'}
          </button>
        )}
      </div>

      <p className="mb-6 text-xs text-muted-foreground">
        <span className="text-destructive">*</span> 표시 항목을 모두 채우면 작성완료 상태가 됩니다.
      </p>

      <div className="space-y-6">
        {/*
          음식/체험 구분 + 부스 운영 ON/OFF — 부스 타입을 먼저 정해야 아래 라벨
          (소개글/체험 설명, 대표 메뉴/체험명)이 맞는 맥락으로 노출되므로 폼 최상단.
          음식 부스 / 푸드트럭 / 체험은 상호 배타 — isFood + isFoodTruck 두 boolean 으로 인코딩
          (음식 부스=isFood&&!isFoodTruck, 푸드트럭=isFood&&isFoodTruck, 체험=!isFood).
        */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="flex items-center gap-5">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isFood && !isFoodTruck}
                disabled={!isEditing}
                onChange={() => {
                  setIsFood(true);
                  setIsFoodTruck(false);
                }}
                className="h-4 w-4 accent-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
              <span className="text-sm font-semibold text-foreground">
                음식 부스
                <RequiredMark />
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isFood && isFoodTruck}
                disabled={!isEditing}
                onChange={() => {
                  setIsFood(true);
                  setIsFoodTruck(true);
                }}
                className="h-4 w-4 accent-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
              <span className="text-sm font-semibold text-foreground">
                푸드트럭
                <RequiredMark />
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={!isFood}
                disabled={!isEditing}
                onChange={() => {
                  setIsFood(false);
                  setIsFoodTruck(false);
                }}
                className="h-4 w-4 accent-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
              <span className="text-sm font-semibold text-foreground">
                체험 부스
                <RequiredMark />
              </span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-foreground">부스 운영 여부</span>
            <button
              type="button"
              onClick={() => isEditing && onIsReservableChange(!isReservable)}
              disabled={!isEditing}
              aria-pressed={isReservable}
              className={`
                relative w-14 h-7 rounded-full transition-all duration-300
                ${isReservable ? 'bg-ds-success shadow-lg' : 'bg-ds-gray-400'}
                ${!isEditing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-background rounded-full shadow-md transition-all duration-300 ${
                  isReservable ? 'left-8' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="booth-name"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              부스명
              <RequiredMark />
            </label>
            {isEditing ? (
              <input
                id="booth-name"
                type="text"
                placeholder="부스 이름을 입력하세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            ) : (
              <div id="booth-name" className={readonlyClass}>
                {name}
              </div>
            )}
          </div>
          <div>
            <label
              htmlFor="booth-organization"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              단체명
              <RequiredMark />
            </label>
            {isEditing ? (
              <input
                id="booth-organization"
                type="text"
                placeholder="단체 이름을 입력하세요"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className={inputClass}
              />
            ) : (
              <div id="booth-organization" className={readonlyClass}>
                {organization}
              </div>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="booth-description"
            className="block text-sm font-semibold text-foreground mb-2"
          >
            {isFood ? '부스 소개글' : '체험 설명'}
          </label>
          {isEditing ? (
            <textarea
              id="booth-description"
              rows={9}
              placeholder={
                isFood
                  ? `아래 내용을 참고해 부스를 소개해주세요!

부스 컨셉 및 소개
판매 메뉴와 가격 안내
진행 예정 이벤트 및 참여 방법
예약 방법 및 운영 시간
현장 주문/웨이팅 방법
결제 가능 수단 안내
방문 시 유의사항 및 공지사항`
                  : `체험 내용·소요 시간·참여 방법·준비물·유의사항 등을 안내해 주세요.`
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} resize-none`}
            />
          ) : (
            <div id="booth-description" className={`${readonlyClass} min-h-[112px]`}>
              {description}
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="booth-notice"
            className="block text-sm font-semibold text-foreground mb-2"
          >
            부스 공지
          </label>
          {isEditing ? (
            <>
              <textarea
                id="booth-notice"
                rows={3}
                placeholder="조기 마감·품절 등 방문객에게 바로 알릴 공지를 입력하세요. (예: 재료 소진으로 18시에 조기 마감합니다.)"
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
                className={`${inputClass} resize-none`}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                입력한 공지는 방문객용 앱의 부스 상세에 강조 표시됩니다.
              </p>
            </>
          ) : notice.trim() ? (
            <div
              id="booth-notice"
              className="flex items-start gap-2 rounded-lg border border-ds-success bg-ds-success-subtle px-4 py-3 text-ds-success-pressed"
            >
              <Megaphone size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span className="whitespace-pre-wrap text-sm font-medium">{notice}</span>
            </div>
          ) : (
            <div className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground">
              등록된 공지가 없습니다.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label
              htmlFor="booth-date"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              축제 일차
              <RequiredMark />
            </label>
            {isEditing ? (
              <select
                id="booth-date"
                value={date ?? ''}
                onChange={(e) => handleDateChange(e.target.value)}
                className={inputClass}
              >
                <option value="">선택 안 함</option>
                {FESTIVAL_DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            ) : (
              <div id="booth-date" className={readonlyClass}>
                {date != null ? festivalDayLabel(date) : '-'}
              </div>
            )}
          </div>
          <div>
            <label
              htmlFor="booth-open-time"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              운영 시작
              <RequiredMark />
            </label>
            {isEditing ? (
              <TimeSelect id="booth-open-time" value={openTime} onChange={setOpenTime} />
            ) : (
              <div id="booth-open-time" className={readonlyClass}>
                {openTime || '-'}
              </div>
            )}
          </div>
          <div>
            <label
              htmlFor="booth-close-time"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              운영 종료
              <RequiredMark />
            </label>
            {isEditing ? (
              <TimeSelect id="booth-close-time" value={closeTime} onChange={setCloseTime} />
            ) : (
              <div id="booth-close-time" className={readonlyClass}>
                {closeTime || '-'}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label
              htmlFor="booth-sector"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              구역
              <RequiredMark />
            </label>
            {isEditing ? (
              <select
                id="booth-sector"
                value={sector ?? ''}
                onChange={(e) => setSector((e.target.value || null) as BoothSector | null)}
                className={inputClass}
              >
                <option value="">선택 안 함</option>
                {sectorsForDay(date).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <div id="booth-sector" className={readonlyClass}>
                {sector ?? '-'}
              </div>
            )}
          </div>
          <div>
            <label
              htmlFor="booth-location"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              배치 번호
              <RequiredMark />
            </label>
            {isEditing ? (
              <input
                id="booth-location"
                type="number"
                placeholder="배치 번호"
                value={location ?? ''}
                onChange={(e) => setLocation(e.target.value ? Number(e.target.value) : null)}
                className={inputClass}
              />
            ) : (
              <div id="booth-location" className={readonlyClass}>
                {location ?? '-'}
              </div>
            )}
            {isEditing && (
              <p className="mt-2 text-xs text-muted-foreground">
                여러 번호에 걸친 부스는 시작 부스 번호 하나만 입력하세요. (예: 28~30번 → 28)
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="booth-status"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              운영 상태
            </label>
            {isEditing ? (
              <select
                id="booth-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as BoothStatus)}
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {BOOTH_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            ) : (
              <div id="booth-status" className={readonlyClass}>
                {BOOTH_STATUS_LABEL[status]}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="booth-instagram"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              인스타그램 URL
            </label>
            {isEditing ? (
              <input
                id="booth-instagram"
                type="text"
                placeholder="https://instagram.com/..."
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className={inputClass}
              />
            ) : (
              <div id="booth-instagram" className={readonlyClass}>
                {instagram || '-'}
              </div>
            )}
          </div>
          <div>
            <label
              htmlFor="booth-account"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              정산 계좌
            </label>
            {isEditing ? (
              <input
                id="booth-account"
                type="text"
                placeholder="예: 카카오뱅크 1234-5678"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className={inputClass}
              />
            ) : (
              <div id="booth-account" className={readonlyClass}>
                {account || '-'}
              </div>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="booth-representative-menus"
            className="block text-sm font-semibold text-foreground mb-2"
          >
            {isFood ? '부스 태그 입력' : '체험명'}
          </label>
          {isEditing ? (
            <input
              id="booth-representative-menus"
              type="text"
              placeholder={
                isFood
                  ? '쉼표로 구분해 입력 (예: 치킨, 맥주)'
                  : '쉼표로 구분해 입력 (예: VR 체험, 보드게임)'
              }
              value={representativeMenusRaw}
              onChange={(e) => setRepresentativeMenusRaw(e.target.value)}
              className={inputClass}
            />
          ) : booth.representativeMenus.length > 0 ? (
            <div id="booth-representative-menus" className={readonlyClass}>
              {booth.representativeMenus.join(', ')}
            </div>
          ) : (
            <div className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground">
              {isFood ? '등록된 대표 메뉴가 없습니다.' : '등록된 체험명이 없습니다.'}
            </div>
          )}
          {isEditing && (
            <p className="mt-2 text-xs text-muted-foreground">
              {isFood
                ? '태그당 5글자 이내로, 최대 3개까지 입력할 수 있습니다.'
                : '최대 3개까지 입력할 수 있습니다.'}
            </p>
          )}
        </div>

        {/* 부스 이미지 — 대표(display_order=1) + 추가(≥2) 모두 booth_images 컬렉션에서 관리.
            대표는 BoothResponse.thumbnailUrl 의 정본이라 Booth 본체 PUT 이 아닌 이미지 CRUD 로만 반영된다. */}
        <BoothImageGallery boothId={booth.id} editable={isEditing} />

        {/* 하단 저장 버튼 — 긴 폼을 끝까지 스크롤한 뒤 상단으로 올라가지 않아도 저장 가능. */}
        {isEditing && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Check size={18} />
              {updateMutation.isPending ? '저장 중…' : '저장'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
