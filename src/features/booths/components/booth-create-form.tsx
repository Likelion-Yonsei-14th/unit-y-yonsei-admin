import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateBooth } from '@/features/booths/hooks';
import type { BoothCreateInput, BoothSector, BoothStatus } from '@/features/booths/types';
import { BOOTH_STATUS_LABEL } from '@/features/booths/types';
import { useAdminUsers } from '@/features/users/hooks';

const SECTORS: BoothSector[] = ['한글탑', '백양로', '송도'];
const STATUSES: BoothStatus[] = ['OPEN', 'PREPARING', 'CLOSED'];

/**
 * 부스 운영 가능 일차 — 2~4일차(5/27~5/29)만. 1일차(5/26 블루런)는 부스가 없다.
 * BoothInfoForm 의 일차 정의와 동일 체계(2=5/27, 3=5/28, 4=5/29).
 */
const FESTIVAL_DAYS: { value: number; label: string }[] = [
  { value: 2, label: '2일차 (5/27 · 국제캠)' },
  { value: 3, label: '3일차 (5/28 · 신촌캠)' },
  { value: 4, label: '4일차 (5/29 · 신촌캠)' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTE_OPTIONS = ['00', '10', '20', '30', '40', '50'];

// BoothInfoForm 과 동일한 입력 스타일 — DS 토큰 기반.
const inputClass =
  'w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all';

/** 필수 입력 항목 표시. */
function RequiredMark() {
  return (
    <span className="ml-0.5 text-destructive" aria-hidden="true">
      *
    </span>
  );
}

/**
 * 운영 시간 입력 — 24시간제 시(00–23) + 10분 단위 분 드롭다운.
 * BoothInfoForm.TimeSelect 와 동일한 동작. 값은 "HH:mm" 문자열.
 */
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
        onChange={(e) => onChange(e.target.value ? `${e.target.value}:${minute || '00'}` : '')}
        className={inputClass}
        aria-label="시"
      >
        <option value="">--</option>
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
        disabled={!hour}
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 신규 부스 생성 모달 (Super/Master).
 *
 * 부스는 Booth 역할 어드민 계정에 귀속되므로, adminId 는 useAdminUsers() 로
 * 받아온 어드민 풀 중 Booth 역할 계정에서 고른다. 필수: adminId·부스명·운영상태
 * + isFood/isFoodTruck/isReservable 토글. 나머지(단체/일차/시간/구역/배치/SNS/계좌/
 * 소개)는 생성 후 BoothInfoForm 에서 채울 수 있어 모두 선택 입력.
 *
 * 모달로 둔 이유: 생성은 부스 목록 위에서 일어나는 가벼운 액션이라 라우트 전환
 * 없이 컨텍스트를 유지하는 편이 자연스럽다. (편집은 기존 BoothInfoForm 그대로.)
 */
export function BoothCreateForm({ open, onOpenChange }: Props) {
  const createBooth = useCreateBooth();
  const { data: users, isPending: usersPending } = useAdminUsers();

  // Booth 역할 계정만 부스를 가질 수 있다. 필터 후보가 없으면(데이터 미도착 등)
  // 전체를 노출하고 역할 라벨로 식별할 수 있게 한다.
  const boothAdmins = useMemo(() => (users ?? []).filter((u) => u.role === 'Booth'), [users]);
  const adminOptions = boothAdmins.length > 0 ? boothAdmins : (users ?? []);

  const [adminId, setAdminId] = useState<string>('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<BoothStatus>('PREPARING');
  const [isFood, setIsFood] = useState(true);
  const [isFoodTruck, setIsFoodTruck] = useState(false);
  const [isReservable, setIsReservable] = useState(false);
  const [organization, setOrganization] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<string>('');
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [sector, setSector] = useState<BoothSector | ''>('');
  const [location, setLocation] = useState('');
  const [instagram, setInstagram] = useState('');
  const [account, setAccount] = useState('');

  const resetForm = () => {
    setAdminId('');
    setName('');
    setStatus('PREPARING');
    setIsFood(true);
    setIsFoodTruck(false);
    setIsReservable(false);
    setOrganization('');
    setDescription('');
    setDate('');
    setOpenTime('');
    setCloseTime('');
    setSector('');
    setLocation('');
    setInstagram('');
    setAccount('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleSubmit = () => {
    // 필수값 검증 — 백엔드 @NotNull/@NotBlank(adminId·name·status)와 일치.
    if (!adminId) {
      toast.error('부스를 배정할 계정을 선택해주세요.');
      return;
    }
    if (!name.trim()) {
      toast.error('부스명을 입력해주세요.');
      return;
    }

    const input: BoothCreateInput = {
      adminId: Number(adminId),
      name: name.trim(),
      status,
      isFood,
      isFoodTruck,
      isReservable,
      organization: organization.trim() || undefined,
      description: description.trim() || undefined,
      date: date ? Number(date) : null,
      openTime: openTime || null,
      closeTime: closeTime || null,
      sector: sector || null,
      location: location ? Number(location) : null,
      instagram: instagram.trim() || undefined,
      account: account.trim() || undefined,
    };

    createBooth.mutate(input, {
      onSuccess: () => {
        toast.success('새 부스를 생성했습니다.');
        resetForm();
        onOpenChange(false);
      },
      onError: () => {
        toast.error('부스 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>부스 생성</DialogTitle>
          <DialogDescription>
            Booth 역할 계정에 새 부스를 배정합니다. 세부 정보는 생성 후 부스 정보 관리에서 채울 수
            있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <label
              htmlFor="create-booth-admin"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              배정 계정
              <RequiredMark />
            </label>
            <Select value={adminId} onValueChange={setAdminId} disabled={usersPending}>
              <SelectTrigger id="create-booth-admin" className="h-auto py-3">
                <SelectValue
                  placeholder={usersPending ? '계정 불러오는 중…' : 'Booth 역할 계정 선택'}
                />
              </SelectTrigger>
              <SelectContent>
                {adminOptions.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.userId}
                    {u.affiliation ? ` · ${u.affiliation}` : ''}
                    {u.role !== 'Booth' ? ` (${u.role})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!usersPending && adminOptions.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                배정 가능한 계정이 없습니다. 먼저 Booth 역할 계정을 생성하세요.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="create-booth-name"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                부스명
                <RequiredMark />
              </label>
              <input
                id="create-booth-name"
                type="text"
                placeholder="부스 이름을 입력하세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="create-booth-organization"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                단체명
              </label>
              <input
                id="create-booth-organization"
                type="text"
                placeholder="단체 이름을 입력하세요"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-5">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={isFood}
                  onChange={() => setIsFood(true)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm font-semibold text-foreground">음식 부스</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={!isFood}
                  onChange={() => setIsFood(false)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm font-semibold text-foreground">체험 부스</span>
              </label>
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isFoodTruck}
                onChange={(e) => setIsFoodTruck(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm font-semibold text-foreground">푸드트럭</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isReservable}
                onChange={(e) => setIsReservable(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm font-semibold text-foreground">예약 받기(운영 ON)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label
                htmlFor="create-booth-date"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                축제 일차
              </label>
              <select
                id="create-booth-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              >
                <option value="">선택 안 함</option>
                {FESTIVAL_DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="create-booth-open-time"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                운영 시작
              </label>
              <TimeSelect id="create-booth-open-time" value={openTime} onChange={setOpenTime} />
            </div>
            <div>
              <label
                htmlFor="create-booth-close-time"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                운영 종료
              </label>
              <TimeSelect id="create-booth-close-time" value={closeTime} onChange={setCloseTime} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label
                htmlFor="create-booth-sector"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                구역
              </label>
              <select
                id="create-booth-sector"
                value={sector}
                onChange={(e) => setSector((e.target.value || '') as BoothSector | '')}
                className={inputClass}
              >
                <option value="">선택 안 함</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="create-booth-location"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                배치 번호
              </label>
              <input
                id="create-booth-location"
                type="number"
                placeholder="배치 번호"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="create-booth-status"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                운영 상태
                <RequiredMark />
              </label>
              <select
                id="create-booth-status"
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
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="create-booth-instagram"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                인스타그램 URL
              </label>
              <input
                id="create-booth-instagram"
                type="text"
                placeholder="https://instagram.com/..."
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="create-booth-account"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                정산 계좌
              </label>
              <input
                id="create-booth-account"
                type="text"
                placeholder="예: 카카오뱅크 1234-5678"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="create-booth-description"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              {isFood ? '부스 소개글' : '체험 설명'}
            </label>
            <textarea
              id="create-booth-description"
              rows={4}
              placeholder={
                isFood
                  ? '부스 컨셉·판매 메뉴·이벤트 등을 안내해 주세요.'
                  : '체험 내용·소요 시간·참여 방법 등을 안내해 주세요.'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="px-6 py-3 rounded-lg border border-border text-foreground hover:bg-muted transition-colors duration-200"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createBooth.isPending}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {createBooth.isPending ? '생성 중…' : '부스 생성'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
