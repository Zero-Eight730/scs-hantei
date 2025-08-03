// public/common.js

function normalizeName(name) {
    if (typeof name !== 'string') return '';
    return name.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/\s+/g, '');
}

// 標準ルール用の計算関数
function calculateCustomMajor(subjects, rule) {
    let remainingSubjects = JSON.parse(JSON.stringify(subjects));
    let breakdown = []; 
    let totalScore = 0; 
    let totalCredits = 0; 
    let maxScore = 0;
    const includedNames = new Set();

    (rule.groups || []).forEach(group => {
        let groupSubjects = remainingSubjects.filter(s => (group.subjects || []).includes(s.name));
        groupSubjects.sort((a, b) => b.grade - a.grade);
        let groupCredits = 0;
        groupSubjects.forEach(subject => {
            if (!group.cap || group.cap === 0 || groupCredits + subject.credits <= group.cap) {
                groupCredits += subject.credits;
                totalScore += subject.grade * subject.credits * group.weight;
                maxScore += 100 * subject.credits * group.weight;
                breakdown.push({ text: `${subject.name} (${group.name})`, status: 'included'});
                includedNames.add(subject.name);
            }
        });
        totalCredits += groupCredits;
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

// 新しい物理学類型ルール用の計算関数
function calculateTieredMajor(subjects, rule) {
    const allSubjects = JSON.parse(JSON.stringify(subjects));
    let breakdown = [];
    
    // 1. 全科目を「重点(Tier1)」「準重点(Tier2)」「その他」に分類
    const tier1Subjects = [];
    const tier2Subjects = [];
    
    allSubjects.forEach(s => {
        if ((rule.prioritySubjects || []).includes(s.name)) {
            s.weight = rule.priorityWeight || 2.0;
            s.efficiency = s.grade * s.weight;
            tier1Subjects.push(s);
        } else {
            s.weight = 1.0; // 重点以外はすべて重み1
            s.efficiency = s.grade * s.weight;
            tier2Subjects.push(s);
        }
    });

    // 2. 重点と準重点を混ぜて効率順にソート
    const combinedPriority = [...tier1Subjects, ...tier2Subjects];
    combinedPriority.sort((a, b) => b.efficiency - a.efficiency);

    let totalScore = 0;
    let totalCredits = 0;
    let maxScore = 0;
    let priorityCredits = 0;
    const includedNames = new Set();
    const rulePriorityCap = rule.priorityCreditCap || 0;
    const ruleTotalCap = rule.totalCap || 0;

    // 3. 重点・準重点の枠を埋める
    for (const subject of combinedPriority) {
        if ((ruleTotalCap > 0 && totalCredits >= ruleTotalCap) || (rulePriorityCap > 0 && priorityCredits >= rulePriorityCap)) {
            break;
        }
        if (ruleTotalCap > 0 && totalCredits + subject.credits > ruleTotalCap) {
            continue;
        }
        if (rulePriorityCap > 0 && priorityCredits + subject.credits > rulePriorityCap) {
            continue;
        }
        
        priorityCredits += subject.credits;
        totalCredits += subject.credits;
        totalScore += subject.grade * subject.credits * subject.weight;
        maxScore += 100 * subject.credits * subject.weight;
        breakdown.push({ text: `${subject.name} [貢献:${(subject.grade * subject.credits * subject.weight).toFixed(2)}] (x${subject.weight})`, status: 'included' });
        includedNames.add(subject.name);
    }
    
    // 4. 残りの科目を0.1倍枠として計算
    let remainingSubjects = allSubjects.filter(s => !includedNames.has(s.name));
    remainingSubjects.forEach(s => s.efficiency = s.grade * (rule.overflowWeight || 0.1));
    remainingSubjects.sort((a, b) => b.efficiency - a.efficiency);

    for (const subject of remainingSubjects) {
        if (ruleTotalCap > 0 && totalCredits >= ruleTotalCap) {
            break;
        }
        if (ruleTotalCap > 0 && totalCredits + subject.credits > ruleTotalCap) {
            continue;
        }

        totalCredits += subject.credits;
        const scoreToAdd = subject.grade * subject.credits * subject.weight * (rule.overflowWeight || 0.1);
        const maxScoreToAdd = 100 * subject.credits * subject.weight * (rule.overflowWeight || 0.1);
        totalScore += scoreToAdd;
        maxScore += maxScoreToAdd;
        breakdown.push({ text: `${subject.name} [貢献:${scoreToAdd.toFixed(2)}] (x${subject.weight} @ 0.1倍)`, status: 'included' });
        includedNames.add(subject.name);
    }

    // 5. 計算から漏れた科目をリストアップ
    allSubjects.forEach(s => {
        if (!includedNames.has(s.name)) {
             breakdown.push({ text: s.name, status: 'excluded', reason: '優先度不足または上限超過' });
        }
    });

    return { score: totalScore, credits: totalCredits, breakdown, maxScore };
}
