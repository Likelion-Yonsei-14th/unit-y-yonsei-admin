import { useState } from "react";
import { Trash2, Map } from "lucide-react";
import { mockMappings, type BoothMapping } from "@/mocks/booth-mappings";

export function BoothLayoutPage() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [boothNumber, setBoothNumber] = useState<string>("");
  const [boothName, setBoothName] = useState<string>("");
  const [organizationName, setOrganizationName] = useState<string>("");
  const [mappings, setMappings] = useState<BoothMapping[]>(mockMappings);

  // 날짜에 따른 위치 옵션
  const getLocationOptions = () => {
    if (selectedDate === "2026-05-27") {
      return ["국제캠"];
    } else if (selectedDate === "2026-05-28" || selectedDate === "2026-05-29") {
      return ["백양로", "한글탑"];
    }
    return [];
  };

  const handleSubmit = () => {
    if (!selectedDate || !selectedLocation || !boothNumber || !boothName || !organizationName) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    const newMapping: BoothMapping = {
      id: mappings.length + 1,
      date: selectedDate,
      location: selectedLocation,
      boothNumber,
      boothName,
      organizationName,
    };

    setMappings([...mappings, newMapping]);
    
    // 폼 초기화
    setBoothNumber("");
    setBoothName("");
    setOrganizationName("");
  };

  const handleDelete = (id: number) => {
    setMappings(mappings.filter(m => m.id !== id));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-foreground mb-8 flex items-center gap-3">
        <Map size={32} />
        부스 배치도 매칭
      </h1>

      <div className="bg-background rounded-2xl border border p-8 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-6">부스 정보 등록</h2>
        
        <div className="space-y-6">
          {/* Step 1: 일자 선택 */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Step 1. 일자 선택
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedDate("2026-05-27");
                  setSelectedLocation("");
                }}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  selectedDate === "2026-05-27"
                    ? "border-primary bg-ds-primary-subtle text-ds-primary-pressed font-semibold"
                    : "border-border text-muted-foreground hover:border-ds-border-strong"
                }`}
              >
                5/27 (화) - 국제캠
              </button>
              <button
                onClick={() => {
                  setSelectedDate("2026-05-28");
                  setSelectedLocation("");
                }}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  selectedDate === "2026-05-28"
                    ? "border-primary bg-ds-primary-subtle text-ds-primary-pressed font-semibold"
                    : "border-border text-muted-foreground hover:border-ds-border-strong"
                }`}
              >
                5/28 (수) - 신촌캠
              </button>
              <button
                onClick={() => {
                  setSelectedDate("2026-05-29");
                  setSelectedLocation("");
                }}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  selectedDate === "2026-05-29"
                    ? "border-primary bg-ds-primary-subtle text-ds-primary-pressed font-semibold"
                    : "border-border text-muted-foreground hover:border-ds-border-strong"
                }`}
              >
                5/29 (목) - 신촌캠
              </button>
            </div>
          </div>

          {/* Step 2: 부스 위치 선택 */}
          {selectedDate && (
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">
                Step 2. 부스 위치 선택
              </label>
              <div className="flex gap-3">
                {getLocationOptions().map((location) => (
                  <button
                    key={location}
                    onClick={() => setSelectedLocation(location)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                      selectedLocation === location
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700 font-semibold"
                        : "border-border text-muted-foreground hover:border-ds-border-strong"
                    }`}
                  >
                    {location}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: 부스 정보 입력 */}
          {selectedLocation && (
            <div className="border-t border pt-6">
              <label className="block text-sm font-semibold text-foreground mb-3">
                Step 3. 부스 정보 입력
              </label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-2">부스 번호</label>
                  <input
                    type="text"
                    placeholder="예: 1"
                    value={boothNumber}
                    onChange={(e) => setBoothNumber(e.target.value)}
                    className="w-full px-4 py-3 border border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-2">부스명</label>
                  <input
                    type="text"
                    placeholder="부스 이름"
                    value={boothName}
                    onChange={(e) => setBoothName(e.target.value)}
                    className="w-full px-4 py-3 border border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-2">단체명</label>
                  <input
                    type="text"
                    placeholder="단체 이름"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full px-4 py-3 border border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 등록 버튼 */}
          {selectedLocation && (
            <div className="flex justify-end pt-4">
              <button 
                onClick={handleSubmit}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-200 transition-all duration-200"
              >
                매칭 정보 저장
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 아카이브: 등록된 매칭 정보 */}
      <div className="bg-background rounded-2xl border border overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border">
          <h2 className="text-lg font-semibold text-foreground">등록된 부스 배치 정보</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">일자</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">위치</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">부스 번호</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">부스명</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">단체명</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">액션</th>
              </tr>
            </thead>
            <tbody>
              {mappings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    등록된 부스 배치 정보가 없습니다.
                  </td>
                </tr>
              ) : (
                mappings.map((mapping) => (
                  <tr key={mapping.id} className="border-b border hover:bg-muted transition-colors">
                    <td className="px-6 py-4 text-sm text-foreground">{formatDate(mapping.date)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-3 py-1 bg-ds-primary-subtle text-ds-primary-pressed rounded-full text-xs font-medium">
                        {mapping.location}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground font-semibold">{mapping.boothNumber}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{mapping.boothName}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{mapping.organizationName}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleDelete(mapping.id)}
                        className="p-2 text-destructive hover:bg-ds-error-subtle rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}