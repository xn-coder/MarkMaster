
import type { SubjectTemplateItem } from '@/types';
import type { MarksheetFormData, SubjectEntryFormData } from '@/types';

// Consistent Category Type based on schema
type FormSubjectCategory = SubjectEntryFormData['category'];

const ALL_FACULTY_COMPULSORY_SUBJECTS_TEMPLATES: SubjectTemplateItem[] = [
  { subjectName: "English", category: "Compulsory", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Hindi", category: "Compulsory", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Urdu", category: "Compulsory", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Maithili", category: "Compulsory", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Sanskrit", category: "Compulsory", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Prakriti", category: "Compulsory", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Magahi", category: "Compulsory", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Bhojpuri", category: "Compulsory", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Arabic", category: "Compulsory", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Persian", category: "Compulsory", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Pali", category: "Compulsory", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Bangla", category: "Compulsory", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
];

const ARTS_ELECTIVE_SUBJECT_TEMPLATES: SubjectTemplateItem[] = [
  { subjectName: "Music", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Home Science", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Philosophy", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "History", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Political Science", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Geography", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Psychology", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Sociology", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Economics", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 }, // Also in Commerce
  { subjectName: "Mathematics", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 }, // Also in Science
];

const SCIENCE_ELECTIVE_SUBJECT_TEMPLATES: SubjectTemplateItem[] = [
  { subjectName: "Physics", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Chemistry", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Biology", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Agriculture", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Mathematics", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 }, // Also in Arts
];

const COMMERCE_ELECTIVE_SUBJECT_TEMPLATES: SubjectTemplateItem[] = [
  { subjectName: "Business Studies", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Entrepreneurship", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
  { subjectName: "Economics", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 }, // Also in Arts
  { subjectName: "Accountancy", category: "Elective", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
];

const CORE_ADDITIONAL_SUBJECTS: SubjectTemplateItem[] = [
    { subjectName: "Yoga and Physical Education", category: "Additional", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
    { subjectName: "Computer Science", category: "Additional", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
    { subjectName: "Multimedia and Web Tech", category: "Additional", totalMarks: 100, theoryPassMarks: 21, practicalPassMarks: 9 },
];

function getUniqueAdditionalSubjects(facultyElectives: SubjectTemplateItem[]): SubjectTemplateItem[] {
    const facultyElectiveNames = new Set(facultyElectives.map(s => s.subjectName));
    const compulsoryNames = new Set(ALL_FACULTY_COMPULSORY_SUBJECTS_TEMPLATES.map(s => s.subjectName));
    
    const uniqueFromElectives = facultyElectives
        .filter(s => !CORE_ADDITIONAL_SUBJECTS.find(core => core.subjectName === s.subjectName))
        .map(s => ({ ...s, category: "Additional" as FormSubjectCategory }));

    const uniqueFromCompulsory = ALL_FACULTY_COMPULSORY_SUBJECTS_TEMPLATES
        .filter(s => !CORE_ADDITIONAL_SUBJECTS.find(core => core.subjectName === s.subjectName) && !facultyElectiveNames.has(s.subjectName))
        .map(s => ({ ...s, category: "Additional" as FormSubjectCategory }));

    const combined = [...CORE_ADDITIONAL_SUBJECTS, ...uniqueFromElectives, ...uniqueFromCompulsory];
    
    const uniqueNames = new Set<string>();
    return combined.filter(item => {
        if (uniqueNames.has(item.subjectName)) {
            return false;
        }
        uniqueNames.add(item.subjectName);
        return true;
    });
}

const ARTS_ADDITIONAL_SUBJECT_TEMPLATES = getUniqueAdditionalSubjects(ARTS_ELECTIVE_SUBJECT_TEMPLATES);
const SCIENCE_ADDITIONAL_SUBJECT_TEMPLATES = getUniqueAdditionalSubjects(SCIENCE_ELECTIVE_SUBJECT_TEMPLATES);
const COMMERCE_ADDITIONAL_SUBJECT_TEMPLATES = getUniqueAdditionalSubjects(COMMERCE_ELECTIVE_SUBJECT_TEMPLATES);


export const FACULTY_SUBJECT_TEMPLATES: Record<MarksheetFormData['faculty'], Record<FormSubjectCategory, SubjectTemplateItem[]>> = {
    ARTS: {
        Compulsory: ALL_FACULTY_COMPULSORY_SUBJECTS_TEMPLATES,
        Elective: ARTS_ELECTIVE_SUBJECT_TEMPLATES,
        Additional: ARTS_ADDITIONAL_SUBJECT_TEMPLATES,
    },
    SCIENCE: {
        Compulsory: ALL_FACULTY_COMPULSORY_SUBJECTS_TEMPLATES,
        Elective: SCIENCE_ELECTIVE_SUBJECT_TEMPLATES,
        Additional: SCIENCE_ADDITIONAL_SUBJECT_TEMPLATES,
    },
    COMMERCE: {
        Compulsory: ALL_FACULTY_COMPULSORY_SUBJECTS_TEMPLATES,
        Elective: COMMERCE_ELECTIVE_SUBJECT_TEMPLATES,
        Additional: COMMERCE_ADDITIONAL_SUBJECT_TEMPLATES,
    },
};

export function getSubjectSuggestions(
  faculty: MarksheetFormData['faculty'] | undefined,
  category: FormSubjectCategory | undefined
): SubjectTemplateItem[] {
  if (!faculty || !category) {
    return [];
  }
  return FACULTY_SUBJECT_TEMPLATES[faculty]?.[category] || [];
}

export function findSubjectTemplate(
  subjectName: string,
  faculty: MarksheetFormData['faculty'] | undefined,
  category: FormSubjectCategory | undefined
): SubjectTemplateItem | undefined {
    const suggestions = getSubjectSuggestions(faculty, category);
    return suggestions.find(s => s.subjectName === subjectName);
}

// --- START: New Default Subjects Definitions ---
interface DefaultSubjectDefinition {
  subjectName: string;
  category: FormSubjectCategory;
}

export const DEFAULT_SUBJECTS_BY_FACULTY: Record<
  MarksheetFormData['faculty'],
  DefaultSubjectDefinition[]
> = {
  SCIENCE: [
    { subjectName: 'English', category: 'Compulsory' },
    { subjectName: 'Hindi', category: 'Compulsory' },
    { subjectName: 'Physics', category: 'Elective' },
    { subjectName: 'Chemistry', category: 'Elective' },
    { subjectName: 'Biology', category: 'Elective' },
    { subjectName: 'Mathematics', category: 'Additional' },
  ],
  ARTS: [
    { subjectName: 'English', category: 'Compulsory' },
    { subjectName: 'Hindi', category: 'Compulsory' },
    { subjectName: 'Geography', category: 'Elective' },
    { subjectName: 'Political Science', category: 'Elective' },
    { subjectName: 'Economics', category: 'Additional' },
  ],
  COMMERCE: [
    { subjectName: 'English', category: 'Compulsory' },
    { subjectName: 'Hindi', category: 'Compulsory' },
    { subjectName: 'Economics', category: 'Elective' },
    { subjectName: 'Accountancy', category: 'Elective' },
    { subjectName: 'Business Studies', category: 'Elective' },
    // No additional subject for Commerce as per user request
  ],
};
// --- END: New Default Subjects Definitions ---
