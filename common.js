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
            if (!group.cap || group.cap === 0 || groupCredits + subject.credits <= group.cap) {
                groupCredits += subject.credits;
                totalScore += subject.grade * subject.credits * group.weight;
                maxScore += 100 * subject.credits * group.weight;
                breakdown.push({ text: `${subject.name} (${group.name})`, status: 'included'});
                includedNames.add(subject.name);
            }
        });
        totalCredits += groupCredits;
        // A group's subjects shouldn't be considered for other groups.
        remainingSubjects = subjects.filter(s => !includedNames.has(s.name));
    });

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
    
    allSubjects.forEach(s => {
        const normalizedName = normalizeName(s.name);
        if ((rule.priorityKeywords || []).some(kw => normalizedName.includes(kw))) {
            s.weight = rule.priorityWeight || 2.0;
        } else {
            s.weight = 1.0;
        }
        s.efficiency = s.grade * s.weight;
    });

    allSubjects.sort((a, b) => b.efficiency - a.efficiency);

    let totalScore = 0;
    let totalCredits = 0;
    let maxScore = 0;
    const includedNames = new Set();
    const rulePriorityCap = rule.priorityCreditCap || 0;
    const ruleTotalCap = rule.totalCap || 0;
    const ruleOverflowWeight = rule.overflowWeight === undefined ? 0.1 : rule.overflowWeight;

    for (const subject of allSubjects) {
        if (ruleTotalCap > 0 && totalCredits >= ruleTotalCap) break;
        if (ruleTotalCap > 0 && totalCredits + subject.credits > ruleTotalCap) continue;
        
        let scoreMultiplier = 1.0;
        let note = `(x${subject.weight})`;

        if (rulePriorityCap > 0 && totalCredits >= rulePriorityCap) {
            scoreMultiplier = ruleOverflowWeight;
            note = `(x${subject.weight} @ ${ruleOverflowWeight}倍)`;
        }
        
        const scoreToAdd = subject.grade * subject.credits * subject.weight * scoreMultiplier;
        const maxScoreToAdd = 100 * subject.credits * subject.weight * scoreMultiplier;
        
        totalCredits += subject.credits;
        totalScore += scoreToAdd;
        maxScore += maxScoreToAdd;
        breakdown.push({ text: `${subject.name} [貢献:${scoreToAdd.toFixed(2)}] ${note}`, status: 'included' });
        includedNames.add(subject.name);
    }
    
    allSubjects.forEach(s => {
        if (!includedNames.has(s.name)) {
             breakdown.push({ text: s.name, status: 'excluded', reason: '優先度不足または上限超過' });
        }
    });

    return { score: totalScore, credits: totalCredits, breakdown, maxScore };
}
