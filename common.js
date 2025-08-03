// public/common.js

function normalizeName(name) {
    if (typeof name !== 'string') return '';
    return name.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/\s+/g, '');
}

function calculateCustomMajor(subjects, rule) {
    let remainingSubjects = JSON.parse(JSON.stringify(subjects));
    let breakdown = []; 
    let totalScore = 0; 
    let totalCredits = 0; 
    let maxScore = 0;
    const includedNames = new Set();
    
    const combinedLimitUsedCredits = {};
    (rule.combinedLimits || []).forEach(limit => {
        combinedLimitUsedCredits[limit.name] = 0;
    });

    // グループは定義された順番（優先順）に処理される
    (rule.groups || []).forEach(group => {
        let groupSubjects;
        
        // ▼▼▼ ここからが新しいロジック ▼▼▼
        // 科目リストが空の場合、このグループは「その他」として扱われる
        if (!group.subjects || group.subjects.length === 0) {
            // まだ計算に含まれていない科目をすべて対象とする
            groupSubjects = remainingSubjects.filter(s => !includedNames.has(s.name));
            // 「その他」グループ内では、成績の良い順に処理する
            groupSubjects.sort((a, b) => b.grade - a.grade);
        } else {
            // 科目リストがある場合は、通常通り個別指定として扱う
            groupSubjects = remainingSubjects.filter(s => (group.subjects || []).includes(s.name));
            groupSubjects.sort((a, b) => b.grade - a.grade);
        }
        // ▲▲▲ ここまで ▲▲▲
        
        let groupCredits = 0;
        groupSubjects.forEach(subject => {
            if (includedNames.has(subject.name)) return;

            if (rule.totalCap > 0 && totalCredits + subject.credits > rule.totalCap) return;
            if (group.cap > 0 && groupCredits + subject.credits > group.cap) return;

            let exceedsCombinedLimit = false;
            (rule.combinedLimits || []).forEach(limit => {
                if ((limit.groupNames || []).includes(group.name)) {
                    if (combinedLimitUsedCredits[limit.name] + subject.credits > limit.cap) {
                        exceedsCombinedLimit = true;
                    }
                }
            });
            if (exceedsCombinedLimit) return;

            groupCredits += subject.credits;
            totalCredits += subject.credits;
            totalScore += subject.grade * subject.credits * group.weight;
            maxScore += 100 * subject.credits * group.weight;
            breakdown.push({ text: `${subject.name} (${group.name})`, status: 'included'});
            includedNames.add(subject.name);

            (rule.combinedLimits || []).forEach(limit => {
                 if ((limit.groupNames || []).includes(group.name)) {
                    combinedLimitUsedCredits[limit.name] += subject.credits;
                }
            });
        });
    });

    subjects.forEach(s => {
        if (!includedNames.has(s.name)) {
             breakdown.push({ text: s.name, status: 'excluded', reason: 'どのグループにも属さず' });
        }
    });

    return { score: totalScore, credits: totalCredits, breakdown, maxScore };
}
