import { useEffect, useState } from 'react';
import { Check, Edit, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import type { UseMutationResult } from '@tanstack/react-query';
import type { Booth, BoothSector, BoothStatus } from '@/features/booths/types';
import { BOOTH_STATUS_LABEL } from '@/features/booths/types';
import { TagInput } from '@/components/common/tag-input';

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
  const [isFood, setIsFood] = useState(booth.isFood);
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
    setIsFood(booth.isFood);
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
      instagram,
      account,
      isReservable,
      representativeMenus: representativeMenusRaw
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean),
      tags,
    };
    updateMutation.mutate(next, {
      onSuccess: () => {
        setIsEditing(false);
        toast.success('부스 정보를 저장했습니다.');
        // 카드 화면으로 복귀 — 갱신된 작성완료 상태를 바로 보여준다.
        onSaved();
      },
      onError: () => {
        toast.error('저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
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
          음식 / 체험은 상호 배타(둘 중 하나) — `isFood` boolean 으로 인코딩.
        */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="flex items-center gap-5">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isFood === true}
                disabled={!isEditing}
                onChange={() => setIsFood(true)}
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
                checked={isFood === false}
                disabled={!isEditing}
                onChange={() => setIsFood(false)}
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

        <div>
          <span className="block text-sm font-semibold text-foreground mb-2">부스 태그</span>
          {isEditing ? (
            <TagInput
              value={tags}
              onChange={setTags}
              inputLabel="부스 태그 입력"
              placeholderExample="먹거리"
            />
          ) : tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-muted text-foreground text-sm rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <div className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground">
              등록된 태그가 없습니다.
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
            {isFood ? '대표 메뉴' : '체험명'}
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
          {isFood && (
            <p className="mt-2 text-xs text-muted-foreground">
              모든 메뉴는 '메뉴 리스트 작성'에서 작성해주세요!
            </p>
          )}
        </div>

        {booth.thumbnailUrl && (
          <div>
            <span className="block text-sm font-semibold text-foreground mb-2">부스 이미지</span>
            <div className="aspect-[3/2] w-full max-w-sm rounded-lg overflow-hidden border border-border">
              <img
                src={booth.thumbnailUrl}
                alt="부스 대표 이미지"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

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
