import { useState } from "react";
import { UserPlus, Check, X, AlertCircle, Shield, FileText } from "lucide-react";

type PermissionType = "Super" | "Master" | "Booth" | "Performer";

export function CreateAdmin() {
  const [userId, setUserId] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [permissionType, setPermissionType] = useState<PermissionType | "">("");
  const [representativeName, setRepresentativeName] = useState("");
  const [representativePhone, setRepresentativePhone] = useState("");
  const [boothName, setBoothName] = useState("");
  const [performanceTeamName, setPerformanceTeamName] = useState("");
  const [internalMemo, setInternalMemo] = useState("");
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const needsBoothName = permissionType === "Booth";
  const needsPerformanceTeamName = permissionType === "Performer";

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!userId.trim()) newErrors.userId = "유저 ID를 입력해주세요";
    if (!tempPassword.trim()) newErrors.tempPassword = "임시 비밀번호를 입력해주세요";
    if (tempPassword.length < 8) newErrors.tempPassword = "비밀번호는 최소 8자 이상이어야 합니다";
    if (!affiliation.trim()) newErrors.affiliation = "소속을 입력해주세요";
    if (!permissionType) newErrors.permissionType = "권한 유형을 선택해주세요";
    if (!representativeName.trim()) newErrors.representativeName = "대표자명을 입력해주세요";
    if (!representativePhone.trim()) newErrors.representativePhone = "대표자 전화번호를 입력해주세요";
    
    if (needsBoothName && !boothName.trim()) {
      newErrors.boothName = "부스명을 입력해주세요";
    }
    
    if (needsPerformanceTeamName && !performanceTeamName.trim()) {
      newErrors.performanceTeamName = "공연팀명을 입력해주세요";
    }

    if (!internalMemo.trim()) {
      newErrors.internalMemo = "내부 메모를 입력해주세요";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // 생성 로직
    console.log({
      userId,
      tempPassword,
      affiliation,
      permissionType,
      representativeName,
      representativePhone,
      boothName: needsBoothName ? boothName : undefined,
      performanceTeamName: needsPerformanceTeamName ? performanceTeamName : undefined,
      internalMemo,
    });

    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      // 폼 초기화
      setUserId("");
      setTempPassword("");
      setAffiliation("");
      setPermissionType("");
      setRepresentativeName("");
      setRepresentativePhone("");
      setBoothName("");
      setPerformanceTeamName("");
      setInternalMemo("");
      setErrors({});
    }, 3000);
  };

  const getPermissionBadgeColor = (type: PermissionType) => {
    switch (type) {
      case "Super":
        return "from-purple-500 to-pink-500";
      case "Master":
        return "from-blue-500 to-cyan-500";
      case "Booth":
        return "from-green-500 to-emerald-500";
      case "Performer":
        return "from-orange-500 to-red-500";
      default:
        return "from-slate-400 to-slate-500";
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <UserPlus size={32} />
          신규 어드민 계정 생성
        </h1>
        <p className="text-muted-foreground mt-2">외부 요청을 받아 새로운 어드민 계정을 생성합니다. 생성된 계정 정보는 요청자에게 전달됩니다.</p>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-ds-success-subtle border border-ds-success text-ds-success-pressed rounded-lg shadow-lg animate-fade-in">
          <div className="w-6 h-6 bg-ds-success rounded-full flex items-center justify-center">
            <Check size={14} className="text-white" />
          </div>
          <span className="font-medium">계정이 성공적으로 생성되었습니다!</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-background rounded-2xl border border p-8 shadow-sm space-y-6">
          {/* Warning Notice */}
          <div className="flex items-start gap-3 p-4 bg-ds-primary-subtle border border-ds-primary rounded-lg">
            <Shield size={20} className="text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-ds-primary-pressed">
              <p className="font-semibold mb-1">관리자 안내사항</p>
              <ul className="list-disc list-inside space-y-1 text-ds-primary-pressed">
                <li>이 페이지는 Super 권한을 가진 운영진만 접근할 수 있습니다</li>
                <li>외부 요청을 검토한 후 적절한 권한을 부여하여 계정을 생성해주세요</li>
                <li>부스/공연팀 계정은 실제 운영하는 부스/공연팀명과 일치해야 합니다</li>
                <li>생성된 계정 정보(ID, 임시 비밀번호)는 요청자에게 안전하게 전달해주세요</li>
              </ul>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                유저 ID <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="example_user"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.userId ? 'border-destructive focus:ring-destructive' : 'border focus:ring-ring'
                }`}
              />
              {errors.userId && <p className="text-destructive text-xs mt-1">{errors.userId}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                임시 비밀번호 <span className="text-destructive">*</span>
              </label>
              <input
                type="password"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="최소 8자 이상"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.tempPassword ? 'border-destructive focus:ring-destructive' : 'border focus:ring-ring'
                }`}
              />
              {errors.tempPassword && <p className="text-destructive text-xs mt-1">{errors.tempPassword}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              소속 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
              placeholder="예: 문헌정보학과, 멋쟁이사자처럼, 총학생회 등"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                errors.affiliation ? 'border-destructive focus:ring-destructive' : 'border focus:ring-ring'
              }`}
            />
            {errors.affiliation && <p className="text-destructive text-xs mt-1">{errors.affiliation}</p>}
          </div>

          {/* Permission Type */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              권한 유형 <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              {(["Super", "Master", "Booth", "Performer"] as PermissionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPermissionType(type)}
                  className={`
                    p-4 rounded-lg border-2 transition-all text-left
                    ${permissionType === type
                      ? `border-transparent bg-gradient-to-r ${getPermissionBadgeColor(type)} text-white shadow-lg`
                      : 'border hover:border-ds-border-strong bg-background'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={18} />
                    <span className="font-bold">{type}</span>
                  </div>
                  <p className={`text-xs ${permissionType === type ? 'text-white/90' : 'text-muted-foreground'}`}>
                    {type === "Super" && "모든 권한 보유"}
                    {type === "Master" && "전체 관리 권한"}
                    {type === "Booth" && "부스 관리 권한"}
                    {type === "Performer" && "공연 관리 권한"}
                  </p>
                </button>
              ))}
            </div>
            {errors.permissionType && <p className="text-destructive text-xs mt-1">{errors.permissionType}</p>}
          </div>

          {/* Booth Name - Conditional */}
          {needsBoothName && (
            <div className="p-4 bg-ds-success-subtle border border-ds-success rounded-lg">
              <label className="block text-sm font-semibold text-ds-success-pressed mb-2">
                부스명 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={boothName}
                onChange={(e) => setBoothName(e.target.value)}
                placeholder="운영할 부스 이름을 입력하세요"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all bg-background ${
                  errors.boothName ? 'border-destructive focus:ring-destructive' : 'border-ds-success focus:ring-ds-success'
                }`}
              />
              {errors.boothName && <p className="text-destructive text-xs mt-1">{errors.boothName}</p>}
            </div>
          )}

          {/* Performance Team Name - Conditional */}
          {needsPerformanceTeamName && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <label className="block text-sm font-semibold text-orange-900 mb-2">
                공연팀명 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={performanceTeamName}
                onChange={(e) => setPerformanceTeamName(e.target.value)}
                placeholder="공연팀 이름을 입력하세요"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all bg-background ${
                  errors.performanceTeamName ? 'border-destructive focus:ring-destructive' : 'border-orange-200 focus:ring-orange-500'
                }`}
              />
              {errors.performanceTeamName && <p className="text-destructive text-xs mt-1">{errors.performanceTeamName}</p>}
            </div>
          )}

          {/* Representative Info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                대표자명 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                placeholder="홍길동"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.representativeName ? 'border-destructive focus:ring-destructive' : 'border focus:ring-ring'
                }`}
              />
              {errors.representativeName && <p className="text-destructive text-xs mt-1">{errors.representativeName}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                대표자 전화번호 <span className="text-destructive">*</span>
              </label>
              <input
                type="tel"
                value={representativePhone}
                onChange={(e) => setRepresentativePhone(e.target.value)}
                placeholder="010-1234-5678"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.representativePhone ? 'border-destructive focus:ring-destructive' : 'border focus:ring-ring'
                }`}
              />
              {errors.representativePhone && <p className="text-destructive text-xs mt-1">{errors.representativePhone}</p>}
            </div>
          </div>

          {/* Internal Memo */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <FileText size={16} />
              내부 메모
            </label>
            <textarea
              rows={4}
              value={internalMemo}
              onChange={(e) => setInternalMemo(e.target.value)}
              placeholder="요청 경로, 검토 내용, 특이사항 등을 기록해주세요. (예: 카카오톡으로 요청받음 - 문헌정보학과 부스 운영 확인 완료)"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all resize-none ${
                errors.internalMemo ? 'border-destructive focus:ring-destructive' : 'border focus:ring-ring'
              }`}
            />
            {errors.internalMemo && <p className="text-destructive text-xs mt-1">{errors.internalMemo}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              계정 생성 이력 관리를 위한 내부 메모입니다. 요청자에게 공개되지 않습니다.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => {
              // 폼 초기화
              setUserId("");
              setTempPassword("");
              setAffiliation("");
              setPermissionType("");
              setRepresentativeName("");
              setRepresentativePhone("");
              setBoothName("");
              setPerformanceTeamName("");
              setInternalMemo("");
              setErrors({});
            }}
            className="px-6 py-3 bg-background border border-ds-border-strong text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            초기화
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-200 transition-all duration-200 flex items-center gap-2"
          >
            <UserPlus size={18} />
            계정 생성
          </button>
        </div>
      </form>
    </div>
  );
}