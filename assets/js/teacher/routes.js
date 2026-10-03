import {renderTeacherReport,renderTeacherCalendar} from './extras.js';
import {renderTeacherSelfAssessment} from './assessment.js';
import {renderTeacherQuran} from './quran.js';
import {renderTeacherWritingPage} from './writing.js';
import {renderTeacherFollowup,renderTeacherWeeklyKpi} from './evaluation.js';
import {renderTeacherSchedule} from './home.js';
import {renderTeacherLearning} from './learning.js';
import {renderTeacherMaterials} from './materials.js';
import {renderTeacherGrades} from './grades.js';
export const TEACHER_ROUTES={
 'teacher-case':renderTeacherReport,
 'education-calendar':renderTeacherCalendar,
 'teacher-assessment':renderTeacherSelfAssessment,
 quran:renderTeacherQuran,
 'teacher-writing':renderTeacherWritingPage,
 'academic-followup':renderTeacherFollowup,
 'teacher-kpi':renderTeacherWeeklyKpi,
 'teacher-attendance':renderTeacherSchedule,
 schedule:renderTeacherSchedule,
 'student-attendance':renderTeacherLearning,
 'lesson-plans':renderTeacherMaterials,
 grades:renderTeacherGrades
};
