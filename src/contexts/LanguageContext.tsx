import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    'app.title': 'Church Kids Management',
    'app.subtitle': 'A comprehensive system for managing church children activities',
    'common.loading': 'Loading...',
    'common.back': 'Back',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.name': 'Name',
    'common.email': 'Email',
    'common.phone': 'Phone',
    'common.date': 'Date',
    'common.notes': 'Notes',
    'common.actions': 'Actions',
    'common.status': 'Status',
    'common.present': 'Present',
    'common.absent': 'Absent',
    'common.yes': 'Yes',
    'common.no': 'No',
    
    // Auth
    'auth.login': 'Login',
    'auth.signup': 'Sign Up',
    'auth.signout': 'Sign Out',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.fullName': 'Full Name',
    'auth.phoneNumber': 'Phone Number',
    'auth.loginDescription': 'Enter your credentials to access your account',
    'auth.signupDescription': 'Create an account to get started',
    'auth.loggingIn': 'Logging in...',
    'auth.creatingAccount': 'Creating account...',
    
    // Index/Landing
    'landing.getStarted': 'Get Started',
    'landing.features': 'Features',
    'landing.childrenManagement': 'Children Management',
    'landing.childrenManagementDesc': 'Register and manage children profiles with parent information and attendance history.',
    'landing.attendanceTracking': 'Attendance Tracking',
    'landing.attendanceTrackingDesc': 'Track attendance for each service with easy check-in and detailed records.',
    'landing.reportsAnalytics': 'Reports & Analytics',
    'landing.reportsAnalyticsDesc': 'Generate comprehensive reports on attendance patterns and trends.',
    'landing.roleBasedAccess': 'Role-Based Access',
    'landing.roleBasedAccessDesc': 'Different access levels for administrators, servants, and parents.',
    'landing.forAdmins': 'For Administrators',
    'landing.forAdminsDesc': 'Full system control, manage all users, children, and generate reports.',
    'landing.forServants': 'For Servants/Teachers',
    'landing.forServantsDesc': 'Record attendance, view assigned children, and communicate with parents.',
    'landing.forParents': 'For Parents',
    'landing.forParentsDesc': 'View your children\'s attendance records and receive notifications.',
    'landing.systemBenefits': 'System Benefits',
    'landing.benefit1': 'Real-time attendance tracking',
    'landing.benefit2': 'Automated absence notifications',
    'landing.benefit3': 'Comprehensive reporting',
    'landing.benefit4': 'Secure data management',
    
    // Dashboard
    'dashboard.welcome': 'Welcome',
    'dashboard.title': 'Dashboard',
    'dashboard.noRole': 'No role assigned. Please contact an administrator.',
    'dashboard.manageChildren': 'Manage Children',
    'dashboard.manageChildrenDesc': 'Add, edit, and view all registered children',
    'dashboard.manageServants': 'Manage Servants',
    'dashboard.manageServantsDesc': 'View and manage servant accounts',
    'dashboard.recordAttendance': 'Record Attendance',
    'dashboard.recordAttendanceDesc': 'Take attendance for today\'s service',
    'dashboard.viewReports': 'View Reports',
    'dashboard.viewReportsDesc': 'Generate and view attendance reports',
    'dashboard.absentChildren': 'Absent Children',
    'dashboard.absentChildrenDesc': 'View and notify parents of absent children',
    'dashboard.manageRoles': 'Manage Roles',
    'dashboard.manageRolesDesc': 'Assign and manage user roles',
    'dashboard.qrCodes': 'QR Codes',
    'dashboard.qrCodesDesc': 'Generate QR codes for children',
    'dashboard.scanQR': 'Scan QR',
    'dashboard.scanQRDesc': 'Scan QR codes to record attendance',
    'dashboard.myChildren': 'My Children',
    'dashboard.myChildrenDesc': 'View your children\'s information',
    'dashboard.attendanceHistory': 'Attendance History',
    'dashboard.attendanceHistoryDesc': 'View attendance records for your children',
    
    // Children
    'children.title': 'Children Management',
    'children.addNew': 'Add New Child',
    'children.noChildren': 'No children found',
    'children.fullName': 'Full Name',
    'children.dateOfBirth': 'Date of Birth',
    'children.parentName': 'Parent Name',
    'children.parentPhone': 'Parent Phone',
    'children.address': 'Address',
    'children.schoolGrade': 'School Grade',
    'children.attendanceStatus': 'Attendance Status',
    
    // Servants
    'servants.title': 'Servants Management',
    'servants.noServants': 'No servants found',
    
    // Attendance
    'attendance.title': 'Attendance',
    'attendance.selectDate': 'Select Date',
    'attendance.recordedBy': 'Recorded by',
    'attendance.markPresent': 'Mark Present',
    'attendance.markAbsent': 'Mark Absent',
    'attendance.alreadyRecorded': 'Attendance already recorded',
    
    // Reports
    'reports.title': 'Reports',
    'reports.generate': 'Generate Report',
    'reports.dateRange': 'Date Range',
    'reports.startDate': 'Start Date',
    'reports.endDate': 'End Date',
    
    // QR
    'qr.title': 'QR Codes',
    'qr.generate': 'Generate QR Code',
    'qr.download': 'Download',
    'qr.print': 'Print',
    'qr.scanTitle': 'QR Scanner',
    'qr.scanInstructions': 'Point your camera at a QR code to scan',
    'qr.scanSuccess': 'Attendance recorded successfully',
    'qr.scanError': 'Error scanning QR code',
    
    // Roles
    'roles.title': 'Manage Roles',
    'roles.admin': 'Admin',
    'roles.servant': 'Servant',
    'roles.parent': 'Parent',
    'roles.assignRole': 'Assign Role',
    'roles.currentRole': 'Current Role',
  },
  ar: {
    // Common
    'app.title': 'إدارة أطفال الكنيسة',
    'app.subtitle': 'نظام شامل لإدارة أنشطة أطفال الكنيسة',
    'common.loading': 'جاري التحميل...',
    'common.back': 'رجوع',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.add': 'إضافة',
    'common.search': 'بحث',
    'common.filter': 'تصفية',
    'common.export': 'تصدير',
    'common.name': 'الاسم',
    'common.email': 'البريد الإلكتروني',
    'common.phone': 'الهاتف',
    'common.date': 'التاريخ',
    'common.notes': 'ملاحظات',
    'common.actions': 'الإجراءات',
    'common.status': 'الحالة',
    'common.present': 'حاضر',
    'common.absent': 'غائب',
    'common.yes': 'نعم',
    'common.no': 'لا',
    
    // Auth
    'auth.login': 'تسجيل الدخول',
    'auth.signup': 'إنشاء حساب',
    'auth.signout': 'تسجيل الخروج',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.fullName': 'الاسم الكامل',
    'auth.phoneNumber': 'رقم الهاتف',
    'auth.loginDescription': 'أدخل بياناتك للوصول إلى حسابك',
    'auth.signupDescription': 'أنشئ حساباً للبدء',
    'auth.loggingIn': 'جاري تسجيل الدخول...',
    'auth.creatingAccount': 'جاري إنشاء الحساب...',
    
    // Index/Landing
    'landing.getStarted': 'ابدأ الآن',
    'landing.features': 'المميزات',
    'landing.childrenManagement': 'إدارة الأطفال',
    'landing.childrenManagementDesc': 'تسجيل وإدارة ملفات الأطفال مع معلومات أولياء الأمور وسجل الحضور.',
    'landing.attendanceTracking': 'تتبع الحضور',
    'landing.attendanceTrackingDesc': 'تتبع الحضور لكل خدمة مع تسجيل سهل وسجلات مفصلة.',
    'landing.reportsAnalytics': 'التقارير والتحليلات',
    'landing.reportsAnalyticsDesc': 'إنشاء تقارير شاملة عن أنماط واتجاهات الحضور.',
    'landing.roleBasedAccess': 'صلاحيات حسب الدور',
    'landing.roleBasedAccessDesc': 'مستويات وصول مختلفة للمسؤولين والخدام وأولياء الأمور.',
    'landing.forAdmins': 'للمسؤولين',
    'landing.forAdminsDesc': 'تحكم كامل بالنظام، إدارة جميع المستخدمين والأطفال وإنشاء التقارير.',
    'landing.forServants': 'للخدام/المعلمين',
    'landing.forServantsDesc': 'تسجيل الحضور، عرض الأطفال المعينين، والتواصل مع أولياء الأمور.',
    'landing.forParents': 'لأولياء الأمور',
    'landing.forParentsDesc': 'عرض سجلات حضور أطفالك وتلقي الإشعارات.',
    'landing.systemBenefits': 'فوائد النظام',
    'landing.benefit1': 'تتبع الحضور في الوقت الفعلي',
    'landing.benefit2': 'إشعارات الغياب التلقائية',
    'landing.benefit3': 'تقارير شاملة',
    'landing.benefit4': 'إدارة بيانات آمنة',
    
    // Dashboard
    'dashboard.welcome': 'مرحباً',
    'dashboard.title': 'لوحة التحكم',
    'dashboard.noRole': 'لم يتم تعيين دور. يرجى الاتصال بالمسؤول.',
    'dashboard.manageChildren': 'إدارة الأطفال',
    'dashboard.manageChildrenDesc': 'إضافة وتعديل وعرض جميع الأطفال المسجلين',
    'dashboard.manageServants': 'إدارة الخدام',
    'dashboard.manageServantsDesc': 'عرض وإدارة حسابات الخدام',
    'dashboard.recordAttendance': 'تسجيل الحضور',
    'dashboard.recordAttendanceDesc': 'تسجيل الحضور لخدمة اليوم',
    'dashboard.viewReports': 'عرض التقارير',
    'dashboard.viewReportsDesc': 'إنشاء وعرض تقارير الحضور',
    'dashboard.absentChildren': 'الأطفال الغائبون',
    'dashboard.absentChildrenDesc': 'عرض وإبلاغ أولياء الأمور عن الأطفال الغائبين',
    'dashboard.manageRoles': 'إدارة الأدوار',
    'dashboard.manageRolesDesc': 'تعيين وإدارة أدوار المستخدمين',
    'dashboard.qrCodes': 'رموز QR',
    'dashboard.qrCodesDesc': 'إنشاء رموز QR للأطفال',
    'dashboard.scanQR': 'مسح QR',
    'dashboard.scanQRDesc': 'مسح رموز QR لتسجيل الحضور',
    'dashboard.myChildren': 'أطفالي',
    'dashboard.myChildrenDesc': 'عرض معلومات أطفالك',
    'dashboard.attendanceHistory': 'سجل الحضور',
    'dashboard.attendanceHistoryDesc': 'عرض سجلات حضور أطفالك',
    
    // Children
    'children.title': 'إدارة الأطفال',
    'children.addNew': 'إضافة طفل جديد',
    'children.noChildren': 'لم يتم العثور على أطفال',
    'children.fullName': 'الاسم الكامل',
    'children.dateOfBirth': 'تاريخ الميلاد',
    'children.parentName': 'اسم ولي الأمر',
    'children.parentPhone': 'هاتف ولي الأمر',
    'children.address': 'العنوان',
    'children.schoolGrade': 'الصف الدراسي',
    'children.attendanceStatus': 'حالة الحضور',
    
    // Servants
    'servants.title': 'إدارة الخدام',
    'servants.noServants': 'لم يتم العثور على خدام',
    
    // Attendance
    'attendance.title': 'الحضور',
    'attendance.selectDate': 'اختر التاريخ',
    'attendance.recordedBy': 'سجّل بواسطة',
    'attendance.markPresent': 'تسجيل حضور',
    'attendance.markAbsent': 'تسجيل غياب',
    'attendance.alreadyRecorded': 'تم تسجيل الحضور مسبقاً',
    
    // Reports
    'reports.title': 'التقارير',
    'reports.generate': 'إنشاء تقرير',
    'reports.dateRange': 'نطاق التاريخ',
    'reports.startDate': 'تاريخ البداية',
    'reports.endDate': 'تاريخ النهاية',
    
    // QR
    'qr.title': 'رموز QR',
    'qr.generate': 'إنشاء رمز QR',
    'qr.download': 'تحميل',
    'qr.print': 'طباعة',
    'qr.scanTitle': 'ماسح QR',
    'qr.scanInstructions': 'وجّه الكاميرا نحو رمز QR للمسح',
    'qr.scanSuccess': 'تم تسجيل الحضور بنجاح',
    'qr.scanError': 'خطأ في مسح رمز QR',
    
    // Roles
    'roles.title': 'إدارة الأدوار',
    'roles.admin': 'مسؤول',
    'roles.servant': 'خادم',
    'roles.parent': 'ولي أمر',
    'roles.assignRole': 'تعيين دور',
    'roles.currentRole': 'الدور الحالي',
  },
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'ar';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const isRTL = language === 'ar';

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [language, isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
