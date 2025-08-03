// public/common.js

function normalizeName(name) {
    if (typeof name !== 'string') return '';
    return name.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/\s+/g, '');
}

function calculateStandardMajor(subjects, rule) {
    let remainingSubjects = JSON.parse(JSON.stringify(subjects));
    let breakdown = []; 
    let totalScore = 0; 
    let totalCredits = 0; 
    let maxScore = 0;
    const includedNames = new Set();

    (rule.groups || []).forEach(group => {
        let groupSubjects;
        if (group.matchType === 'partial') {
            groupSubjects = remainingSubjects.filter(s => (group.keywords || []).some(kw => s.name.includes(kw)));
        } else {
            groupSubjects = remainingSubjects.filter(s => (group.subjects || []).includes(s.name));
        }
        
        groupSubjects.sort((a, b) => b.grade - a.grade);
        
        let groupCredits = 0;
        groupSubjects.forEach(subject => {
            if (!includedNames.has(subject.name) && (!group.cap || group.cap === 0 || groupCredits + subject.credits <= group.cap)) {
                if (!rule.totalCap || rule.totalCap === 0 || totalCredits + subject.credits <= rule.totalCap) {
                    groupCredits += subject.credits;
                    totalCredits += subject.credits;
                    totalScore += subject.grade * subject.credits * group.weight;
                    maxScore += 100 * subject.credits * group.weight;
                    breakdown.push({ text: `${subject.name} (${group.name})`, status: 'included'});
                    includedNames.add(subject.name);
                }
            }
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

function calculateTieredMajor(subjects, rule) {
    const allSubjects = JSON.parse(JSON.stringify(subjects));
    let breakdown = [];
    
    const tier1_subjects_raw = [];
    const other_subjects_raw = [];
    
    allSubjects.forEach(s => {
        const normalizedName = normalizeName(s.name);
        if ((rule.priorityKeywords || []).some(kw => normalizedName.includes(kw))) {
            s.weight = rule.priorityWeight || 2.0;
            s.efficiency = s.grade * s.weight;
            tier1_subjects_raw.push(s);
        } else {
            other_subjects_raw.push(s);
        }
    });

    // 「その他」の中から成績上位4単位分だけを「重み1」の対象として選抜
    other_subjects_raw.sort((a, b) => b.grade - a.grade);
    const tier2_subjects_pool = [];
    let otherPriorityCredits = 0;
    const otherPriorityCap = rule.otherPriorityCap === undefined ? 4.0 : rule.otherPriorityCap;
    for (const subject of other_subjects_raw) {
        if (otherPriorityCredits >= otherPriorityCap) break;
        if (otherPriorityCredits + subject.credits > otherPriorityCap) continue;

        otherPriorityCredits += subject.credits;
        subject.weight = 1.0;
        subject.efficiency = subject.grade * subject.weight;
        tier2_subjects_pool.push(subject);
    }
    
    // 重み2の科目と、選抜された重み1の科目を合算し、効率順にソート
    const combinedPriority = [...tier1_subjects_raw, ...tier2_subjects_pool];
    combinedPriority.sort((a, b) => b.efficiency - a.efficiency);

    let totalScore = 0;
    let totalCredits = 0;
    let maxScore = 0;
    const includedNames = new Set();
    const rulePriorityCap = rule.priorityCreditCap || 18;
    const ruleTotalCap = rule.totalCap || 24;
    const ruleOverflowWeight = rule.overflowWeight === undefined ? 0.1 : rule.overflowWeight;

    // 重点枠の計算
    for (const subject of combinedPriority) {
        if (totalCredits >= rulePriorityCap || totalCredits >= ruleTotalCap) break;
        if (totalCredits + subject.credits > rulePriorityCap || totalCredits + subject.credits > ruleTotalCap) continue;
        
        totalCredits += subject.credits;
        totalScore += subject.grade * subject.credits * subject.weight;
        maxScore += 100 * subject.credits * subject.weight;
        breakdown.push({ text: `${subject.name} [貢献:${(subject.grade * subject.credits * subject.weight).toFixed(2)}] (x${subject.weight})`, status: 'included' });
        includedNames.add(subject.name);
    }
    
    // 超過枠の計算
    let remainingSubjects = allSubjects.filter(s => !includedNames.has(s.name));
    remainingSubjects.forEach(s => {
        s.weight = s.weight || 1.0; // もし重みが未設定なら1とする
        s.efficiency = s.grade * s.weight * ruleOverflowWeight;
    });
    remainingSubjects.sort((a, b) => b.efficiency - a.efficiency);

    for (const subject of remainingSubjects) {
        if (totalCredits >= ruleTotalCap) break;
        if (totalCredits + subject.credits > ruleTotalCap) continue;

        const scoreToAdd = subject.grade * subject.credits * subject.weight * ruleOverflowWeight;
        const maxScoreToAdd = 100 * subject.credits * subject.weight * ruleOverflowWeight;
        
        totalCredits += subject.credits;
        totalScore += scoreToAdd;
        maxScore += maxScoreToAdd;
        breakdown.push({ text: `${subject.name} [貢献:${scoreToAdd.toFixed(2)}] (x${subject.weight} @ ${ruleOverflowWeight}倍)`, status: 'included' });
        includedNames.add(subject.name);
    }

    allSubjects.forEach(s => {
        if (!includedNames.has(s.name)) {
             breakdown.push({ text: s.name, status: 'excluded', reason: '優先度不足または上限超過' });
        }
    });

    return { score: totalScore, credits: totalCredits, breakdown, maxScore };
}
