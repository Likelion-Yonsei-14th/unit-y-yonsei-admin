import { ChevronDown, Instagram, Youtube } from 'lucide-react';
import { TagInput } from '@/components/common/tag-input';
import {
  PERFORMANCE_CATEGORY_LABEL,
  PERFORMANCE_STATUS_LABEL,
  type Performance,
  type PerformanceCategory,
  type PerformanceStatus,
} from '@/features/performances/types';

export interface PerformanceProfileFieldsProps {
  /** 표시 데이터 — 편집 중이면 버퍼, 아니면 서버 데이터. */
  data: Performance;
  /** 편집 모드 여부 — 입력 활성화/플레이스홀더 분기. */
  isEditMode: boolean;
  /** 공연 상태(performanceStatus) 편집 가능 여부 — performance.manage 권한자만. */
  canEditTimetable: boolean;
  /** 편집 버퍼 부분 갱신. */
  onChange: (patch: Partial<Performance>) => void;
}

/**
 * 공연 프로필의 입력 필드 묶음 — 공연명/라인업명/소개글/분류/상태 + SNS 링크.
 * 공연 상태는 운영 스케줄과 얽혀 있어 `canEditTimetable` 권한자만 수정 가능.
 */
export function PerformanceProfileFields({
  data,
  isEditMode,
  canEditTimetable,
  onChange,
}: PerformanceProfileFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="perf-name" className="block text-sm font-semibold text-foreground mb-2">
            공연명
          </label>
          <input
            id="perf-name"
            type="text"
            placeholder="공연 이름을 입력하세요"
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            value={data.performanceName}
            onChange={(e) => onChange({ performanceName: e.target.value })}
            disabled={!isEditMode}
          />
        </div>
        <div>
          <label htmlFor="perf-lineup" className="block text-sm font-semibold text-foreground mb-2">
            라인업명
          </label>
          <input
            id="perf-lineup"
            type="text"
            placeholder="라인업/팀 표기명"
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            value={data.lineupName}
            onChange={(e) => onChange({ lineupName: e.target.value })}
            disabled={!isEditMode}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="perf-description"
          className="block text-sm font-semibold text-foreground mb-2"
        >
          공연 소개글
        </label>
        <textarea
          id="perf-description"
          rows={5}
          placeholder="동아리 소개, 구성원 소개 등을 작성하세요"
          className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
          value={data.performanceDescription}
          onChange={(e) => onChange({ performanceDescription: e.target.value })}
          disabled={!isEditMode}
        />
      </div>

      <div>
        <span className="block text-sm font-semibold text-foreground mb-2">
          해시태그 <span className="font-normal text-muted-foreground">(최대 3개 · 6자 이내)</span>
        </span>
        {isEditMode ? (
          <TagInput
            value={data.hashtags}
            onChange={(hashtags) => onChange({ hashtags })}
            maxTags={3}
            maxLen={6}
            inputLabel="해시태그 입력"
            placeholderExample="라이브밴드"
          />
        ) : data.hashtags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.hashtags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-3 py-1 text-sm text-foreground">
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ds-text-disabled">등록된 해시태그가 없습니다.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="perf-category"
            className="block text-sm font-semibold text-foreground mb-2"
          >
            공연 분류
          </label>
          <div className="relative">
            <select
              id="perf-category"
              className={`w-full appearance-none border border-border rounded-lg bg-background py-3 pl-4 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${
                isEditMode ? 'pr-10' : 'pr-4'
              }`}
              value={data.performanceCategory ?? ''}
              onChange={(e) =>
                onChange({
                  performanceCategory: (e.target.value || null) as PerformanceCategory | null,
                })
              }
              disabled={!isEditMode}
            >
              <option value="">미정</option>
              {(Object.keys(PERFORMANCE_CATEGORY_LABEL) as PerformanceCategory[]).map((c) => (
                <option key={c} value={c}>
                  {PERFORMANCE_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
            {isEditMode && (
              <ChevronDown
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
            )}
          </div>
        </div>
        <div>
          <label htmlFor="perf-status" className="block text-sm font-semibold text-foreground mb-2">
            공연 상태
          </label>
          <div className="relative">
            <select
              id="perf-status"
              className={`w-full appearance-none border border-border rounded-lg bg-background py-3 pl-4 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${
                isEditMode && canEditTimetable ? 'pr-10' : 'pr-4'
              }`}
              value={data.performanceStatus}
              onChange={(e) => onChange({ performanceStatus: e.target.value as PerformanceStatus })}
              disabled={!isEditMode || !canEditTimetable}
            >
              {(Object.keys(PERFORMANCE_STATUS_LABEL) as PerformanceStatus[]).map((s) => (
                <option key={s} value={s}>
                  {PERFORMANCE_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            {isEditMode && canEditTimetable && (
              <ChevronDown
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
            )}
          </div>
        </div>
      </div>

      <div>
        {/* SNS 묶음은 그룹 라벨이라 htmlFor 단일 매칭이 어색함. 각 input 에 aria-label 로 매칭. */}
        <span className="block text-sm font-semibold text-foreground mb-2">SNS 링크 (선택)</span>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 bg-muted text-muted-foreground rounded-lg"
              aria-hidden="true"
            >
              <Instagram size={20} />
            </div>
            <input
              type="text"
              placeholder="인스타그램 URL"
              aria-label="인스타그램 URL"
              className="flex-1 px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              value={data.instagramUrl}
              onChange={(e) => onChange({ instagramUrl: e.target.value })}
              disabled={!isEditMode}
            />
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 bg-muted text-muted-foreground rounded-lg"
              aria-hidden="true"
            >
              <Youtube size={20} />
            </div>
            <input
              type="text"
              placeholder="유튜브 URL"
              aria-label="유튜브 URL"
              className="flex-1 px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              value={data.youtubeUrl}
              onChange={(e) => onChange({ youtubeUrl: e.target.value })}
              disabled={!isEditMode}
            />
          </div>
        </div>
      </div>
    </>
  );
}
