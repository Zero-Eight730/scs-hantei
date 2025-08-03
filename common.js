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

    (rule.groups || []).forEach(group => {
        let groupSubjects = remainingSubjects.filter(s => (group.subjects || []).includes(s.name));
        groupSubjects.sort((a, b) => b.grade - a.grade);
        
        let groupCredits = 0;
        groupSubjects.forEach(subject => {
            if (includedNames.has(subject.name)) return;

            // Check total cap
            if (rule.totalCap > 0 && totalCredits + subject.credits > rule.totalCap) {
                return;
            }
            // Check group cap
            if (group.cap > 0 && groupCredits + subject.credits > group.cap) {
                return;
            }

            // Check combined limits
            let exceedsCombinedLimit = false;
            (rule.combinedLimits || []).forEach(limit => {
                if ((limit.groupNames || []).includes(group.name)) {
                    if (combinedLimitUsedCredits[limit.name] + subject.credits > limit.cap) {
                        exceedsCombinedLimit = true;
                    }
                }
            });
            if (exceedsCombinedLimit) return;

            // If all checks pass, include the subject
            groupCredits += subject.credits;
            totalCredits += subject.credits;
            totalScore += subject.grade * subject.credits * group.weight;
            maxScore += 100 * subject.credits * group.weight;
            breakdown.push({ text: `${subject.name} (${group.name})`, status: 'included'});
            includedNames.add(subject.name);

            // Update combined limits usage
            (rule.combinedLimits || []).forEach(limit => {
                 if ((limit.groupNames || []).includes(group.name)) {
                    combinedLimitUsedCredits[limit.name] += subject.credits;
                }
            });
        });
    });

    remainingSubjects = subjects.filter(s => !includedNames.has(s.name));
    remainingSubjects.forEach(s => s.efficiency = s.grade * (rule.otherWeight || 0));
    remainingSubjects.sort((a, b) => b.efficiency - a.efficiency);

    for (const subject of remainingSubjects) {
        if (!rule.totalCap || rule.totalCap === 0 || totalCredits + subject.credits <= rule.totalCap) {
            totalCredits += subject.credits;
            totalScore += subject.grade * subject.credits * rule.otherWeight;
            maxScore += 100 * subject.credits * rule.otherWeight;
            breakdown.push({ text: `${subject.name} (その他)`, status: 'included' });
            includedNames.add(subject.name);
        }
    }
    
    subjects.forEach(s => {
        if (!includedNames.has(s.name)) {
             breakdown.push({ text: s.name, status: 'excluded', reason: '優先度不足または上限超過' });
        }
    });

    return { score: totalScore, credits: totalCredits, breakdown, maxScore };
}
