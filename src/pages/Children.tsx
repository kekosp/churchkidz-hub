import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Plus, Edit, Trash2, FileText, Upload } from "lucide-react";
import { childSchema } from "@/lib/validation-schemas";
import * as XLSX from "xlsx";
import { useLanguage } from "@/contexts/LanguageContext";

interface Child {
  id: string;
  full_name: string;
  date_of_birth: string;
  age: number;
  address: string;
  parent_name: string;
  parent_phone: string;
  school_grade: string;
  attendance_status: string;
  notes: string;
  servant_id: string | null;
}

const Children = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { t, isRTL } = useLanguage();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [servants, setServants] = useState<any[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");

  const [formData, setFormData] = useState({
    full_name: "",
    date_of_birth: "",
    address: "",
    parent_name: "",
    parent_phone: "",
    school_grade: "",
    attendance_status: "Regular",
    notes: "",
    servant_id: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      fetchChildren();
      fetchServants();
    }
  }, [user, authLoading, navigate]);

  const fetchServants = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, profiles(id, full_name)")
        .eq("role", "servant") as any;

      if (error) throw error;
      setServants(data || []);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error fetching servants:", error);
      }
    }
  };

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .order("full_name") as any;

      if (error) throw error;
      setChildren(data || []);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error loading children:", error);
      }
      toast.error("Unable to load children. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validation = childSchema.safeParse(formData);

      if (!validation.success) {
        const errors = validation.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
        toast.error(errors);
        return;
      }

      const dataToSubmit: any = {
        ...formData,
        servant_id: formData.servant_id || null,
      };

      if (!editingChild && userRole === "parent" && user) {
        dataToSubmit.parent_id = user.id;
      }

      if (editingChild) {
        const { error } = await supabase
          .from("children")
          .update(dataToSubmit)
          .eq("id", editingChild.id) as any;

        if (error) throw error;
        toast.success("Child information updated successfully");
      } else {
        const { error } = await supabase
          .from("children")
          .insert(dataToSubmit) as any;

        if (error) throw error;
        toast.success("Child added successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchChildren();
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error saving child:", error);
      }
      toast.error("Unable to save child information. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('children.confirmDelete'))) return;

    try {
      const { error } = await supabase
        .from("children")
        .delete()
        .eq("id", id) as any;

      if (error) throw error;
      toast.success("Child deleted successfully");
      fetchChildren();
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error deleting child:", error);
      }
      toast.error("Unable to delete child. Please try again.");
    }
  };

  const sanitizeCell = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const str = String(value).trim();
    // Strip potential Excel formula prefixes to avoid formula injection when files are reopened
    const noFormula = str.replace(/^[=+\-@]/, "");
    // Enforce a reasonable max length to avoid huge cell payloads
    return noFormula.slice(0, 255);
  };

  const parseExcelDate = (value: unknown): string => {
    if (value === null || value === undefined || value === "") return "";
    
    // If it's already a valid date string (YYYY-MM-DD)
    if (typeof value === "string") {
      const trimmed = value.trim();
      // Check if it's already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }
      // Try to parse other date formats (DD/MM/YYYY, MM/DD/YYYY, etc.)
      const parsedDate = new Date(trimmed);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split("T")[0];
      }
    }
    
    // Excel stores dates as serial numbers (days since 1899-12-30)
    if (typeof value === "number") {
      // Excel serial date conversion
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
      return date.toISOString().split("T")[0];
    }
    
    return "";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File upload triggered");
    const file = e.target.files?.[0];
    if (!file) {
      console.log("No file selected");
      return;
    }
    
    console.log("File selected:", file.name, file.size, file.type);

    // Basic resource limits to prevent abuse and crashes
    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
    const MAX_ROWS = 1000;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("File too large. Maximum size is 5MB.");
      e.target.value = "";
      return;
    }

    setImporting(true);
    setImportResults(null);
    console.log("Starting import...");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { 
        type: 'array', 
        cellFormula: false,
        cellDates: true,
        dateNF: 'yyyy-mm-dd'
      });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });

      if (jsonData.length > MAX_ROWS) {
        toast.error(`Too many rows. Maximum is ${MAX_ROWS} rows per import.`);
        setImporting(false);
        e.target.value = "";
        return;
      }

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      const { data: existingChildren } = await supabase
        .from("children")
        .select("full_name, date_of_birth, parent_phone");

      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];
        try {
          const rawDob = row["Date of Birth"] || row["date_of_birth"] || row["DOB"] || "";
          const parsedDob = parseExcelDate(rawDob);
          
          const childData = {
            full_name: sanitizeCell(row["Full Name"] || row["full_name"] || row["Name"] || ""),
            date_of_birth: parsedDob,
            parent_name: sanitizeCell(row["Parent Name"] || row["parent_name"] || ""),
            parent_phone: sanitizeCell(row["Parent Phone"] || row["parent_phone"] || row["Phone"] || ""),
            address: sanitizeCell(row["Address"] || row["address"] || ""),
            school_grade: sanitizeCell(row["School Grade"] || row["school_grade"] || row["Grade"] || ""),
            attendance_status: sanitizeCell(row["Attendance Status"] || row["attendance_status"] || "Regular"),
            notes: sanitizeCell(row["Notes"] || row["notes"] || ""),
            servant_id: null,
          };

          const validation = childSchema.safeParse(childData);
          if (!validation.success) {
            const errorMsg = validation.error.errors.map((e) => e.message).join(", ");
            errors.push(`Row ${i + 2}: ${errorMsg}`);
            failedCount++;
            continue;
          }

          const isDuplicate = existingChildren?.some(
            (child) =>
              child.full_name.toLowerCase() === childData.full_name.toLowerCase() &&
              child.date_of_birth === childData.date_of_birth &&
              child.parent_phone === childData.parent_phone
          );

          if (isDuplicate) {
            errors.push(`Row ${i + 2}: Duplicate entry for ${childData.full_name}`);
            failedCount++;
            continue;
          }

          const dataToInsert: any = { ...childData };

          if (userRole === "parent" && user) {
            dataToInsert.parent_id = user.id;
          }

          const { error } = await supabase
            .from("children")
            .insert(dataToInsert);

          if (error) throw error;

          successCount++;
        } catch (error: any) {
          errors.push(`Row ${i + 2}: ${error.message}`);
          failedCount++;
        }
      }

      setImportResults({ success: successCount, failed: failedCount, errors });
      
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} children`);
        fetchChildren();
      }
      
      if (failedCount > 0) {
        toast.error(`Failed to import ${failedCount} children. Check the results for details.`);
      }
    } catch (error: any) {
      toast.error("Failed to parse file. Please ensure it's a valid Excel or CSV file.");
      if (import.meta.env.DEV) {
        console.error("Import error:", error);
      }
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleGoogleSheetImport = async () => {
    if (!googleSheetUrl.trim()) {
      toast.error("Please enter a Google Sheets URL");
      return;
    }

    // Extract sheet ID from various Google Sheets URL formats
    const sheetIdMatch = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      toast.error("Invalid Google Sheets URL. Please use a valid Google Sheets link.");
      return;
    }

    const sheetId = sheetIdMatch[1];
    setImporting(true);
    setImportResults(null);

    try {
      // Fetch as CSV from the public export URL
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const response = await fetch(csvUrl);
      
      if (!response.ok) {
        throw new Error("Could not fetch the sheet. Make sure it's set to 'Anyone with the link can view'.");
      }

      const csvText = await response.text();
      const rows = csvText.split('\n').map(row => {
        // Parse CSV properly handling quoted values
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      });

      if (rows.length < 2) {
        toast.error("The sheet appears to be empty or has no data rows.");
        setImporting(false);
        return;
      }

      const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
      const dataRows = rows.slice(1).filter(row => row.some(cell => cell.trim()));

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      const { data: existingChildren } = await supabase
        .from("children")
        .select("full_name, date_of_birth, parent_phone");

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        try {
          const getValue = (possibleHeaders: string[]) => {
            for (const h of possibleHeaders) {
              const idx = headers.findIndex(header => header.includes(h));
              if (idx !== -1 && row[idx]) {
                return sanitizeCell(row[idx]);
              }
            }
            return "";
          };

          const fullName = getValue(["full_name", "name", "الاسم", "اسم", "الاسم_الكامل", "اسم_الطفل"]);
          const dateOfBirth = parseExcelDate(getValue(["date_of_birth", "dob", "birth", "تاريخ", "تاريخ_الميلاد", "الميلاد"]));
          const parentName = getValue(["parent_name", "parent", "ولي", "ولي_الأمر", "اسم_ولي_الأمر", "الأب", "الام"]);
          const parentPhone = getValue(["parent_phone", "phone", "هاتف", "تليفون", "رقم_الهاتف", "موبايل", "الموبايل"]);

          // Show specific missing field errors
          const missingFields: string[] = [];
          if (!fullName) missingFields.push("Name/الاسم");
          if (!dateOfBirth) missingFields.push("Date of Birth/تاريخ الميلاد");
          if (!parentName) missingFields.push("Parent Name/ولي الأمر");
          if (!parentPhone) missingFields.push("Phone/هاتف");

          if (missingFields.length > 0) {
            errors.push(`Row ${i + 2}: Missing fields: ${missingFields.join(", ")}`);
            failedCount++;
            continue;
          }

          const childData = {
            full_name: fullName,
            date_of_birth: dateOfBirth,
            parent_name: parentName,
            parent_phone: parentPhone,
            address: getValue(["address", "عنوان", "العنوان"]),
            school_grade: getValue(["school_grade", "grade", "الصف", "المرحلة", "السنة"]),
            attendance_status: getValue(["attendance_status", "status"]) || "Regular",
            notes: getValue(["notes", "ملاحظات"]),
            servant_id: "",
          };

          const validation = childSchema.safeParse(childData);
          if (!validation.success) {
            const errorMsg = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(", ");
            errors.push(`Row ${i + 2}: ${errorMsg}`);
            failedCount++;
            continue;
          }

          const isDuplicate = existingChildren?.some(
            (child) =>
              child.full_name.toLowerCase() === childData.full_name.toLowerCase() &&
              child.date_of_birth === childData.date_of_birth &&
              child.parent_phone === childData.parent_phone
          );

          if (isDuplicate) {
            errors.push(`Row ${i + 2}: Duplicate entry for ${childData.full_name}`);
            failedCount++;
            continue;
          }

          const dataToInsert: any = { ...childData };
          if (userRole === "parent" && user) {
            dataToInsert.parent_id = user.id;
          }

          const { error } = await supabase.from("children").insert(dataToInsert);
          if (error) throw error;

          successCount++;
        } catch (error: any) {
          errors.push(`Row ${i + 2}: ${error.message}`);
          failedCount++;
        }
      }

      setImportResults({ success: successCount, failed: failedCount, errors });
      
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} children`);
        fetchChildren();
      }
      
      if (failedCount > 0) {
        toast.error(`Failed to import ${failedCount} children. Check the results for details.`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to import from Google Sheets");
      if (import.meta.env.DEV) {
        console.error("Google Sheets import error:", error);
      }
    } finally {
      setImporting(false);
    }
  };
  const downloadTemplate = () => {
    const template = [
      {
        "Full Name": "John Doe",
        "Date of Birth": "2015-05-15",
        "Parent Name": "Jane Doe",
        "Parent Phone": "1234567890",
        "Address": "123 Main St",
        "School Grade": "Grade 3",
        "Attendance Status": "Regular",
        "Notes": "Sample notes"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Children");
    XLSX.writeFile(wb, "children_import_template.xlsx");
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      date_of_birth: "",
      address: "",
      parent_name: "",
      parent_phone: "",
      school_grade: "",
      attendance_status: "Regular",
      notes: "",
      servant_id: "",
    });
    setEditingChild(null);
  };

  const openEditDialog = (child: Child) => {
    setEditingChild(child);
    setFormData({
      full_name: child.full_name,
      date_of_birth: child.date_of_birth,
      address: child.address || "",
      parent_name: child.parent_name,
      parent_phone: child.parent_phone,
      school_grade: child.school_grade || "",
      attendance_status: child.attendance_status,
      notes: child.notes || "",
      servant_id: child.servant_id || "",
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    );
  }

  const canEdit = userRole === "admin" || userRole === "servant";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-accent/10">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
              <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
              {t('common.back')}
            </Button>
            <h1 className="text-3xl font-bold">
              {userRole === "parent" ? t('dashboard.myChildren') : t('children.title')}
            </h1>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" /> {t('common.export')}
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddNew} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t('children.addNew')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingChild ? t('children.editChild') : t('children.addNew')}</DialogTitle>
                    <DialogDescription>{t('children.formDescription')}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">{t('children.fullName')} *</Label>
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date_of_birth">{t('children.dateOfBirth')} *</Label>
                        <Input
                          id="date_of_birth"
                          type="date"
                          value={formData.date_of_birth}
                          onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="parent_name">{t('children.parentName')} *</Label>
                        <Input
                          id="parent_name"
                          value={formData.parent_name}
                          onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parent_phone">{t('children.parentPhone')} *</Label>
                        <Input
                          id="parent_phone"
                          type="tel"
                          value={formData.parent_phone}
                          onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">{t('children.address')}</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="school_grade">{t('children.schoolGrade')}</Label>
                        <Input
                          id="school_grade"
                          value={formData.school_grade}
                          onChange={(e) => setFormData({ ...formData, school_grade: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="attendance_status">{t('children.attendanceStatus')}</Label>
                        <Select
                          value={formData.attendance_status}
                          onValueChange={(value) => setFormData({ ...formData, attendance_status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Regular">{t('children.regular')}</SelectItem>
                            <SelectItem value="Irregular">{t('children.irregular')}</SelectItem>
                            <SelectItem value="New">{t('children.new')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {userRole === "admin" && (
                      <div className="space-y-2">
                        <Label htmlFor="servant_id">{t('children.assignedServant')}</Label>
                        <Select
                          value={formData.servant_id || "_none"}
                          onValueChange={(value) => setFormData({ ...formData, servant_id: value === "_none" ? "" : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('children.selectServant')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">{t('children.noServant')}</SelectItem>
                            {servants.map((servant: any) => (
                              <SelectItem key={servant.user_id} value={servant.user_id}>
                                {servant.profiles?.full_name || "Unknown"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="notes">{t('common.notes')}</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button type="submit">
                        {editingChild ? t('common.edit') : t('common.add')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {userRole === "parent" && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Welcome, Parent!</CardTitle>
              <CardDescription>
                Below you can view your children's information. Your children were automatically linked to your account based on your phone number.
                If you don't see your child listed, please contact an administrator.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
          setIsImportDialogOpen(open);
          if (!open) {
            setGoogleSheetUrl("");
            setImportResults(null);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import Children</DialogTitle>
              <DialogDescription>
                Import children from Google Sheets or upload a file.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Google Sheets Import */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">Recommended</span>
                  Google Sheets
                </h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste your Google Sheets URL here..."
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    disabled={importing}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleGoogleSheetImport} 
                    disabled={importing || !googleSheetUrl.trim()}
                  >
                    Import
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Make sure your sheet is set to "Anyone with the link can view"
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or upload a file</span>
                </div>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  disabled={importing}
                  className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Excel (.xlsx, .xls) or CSV
                </p>
              </div>

              <div className="flex items-center justify-center">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  Download Template
                </Button>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Required Columns:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Full Name</strong> (required)</li>
                  <li>• <strong>Date of Birth</strong> (YYYY-MM-DD)</li>
                  <li>• <strong>Parent Name</strong> (required)</li>
                  <li>• <strong>Parent Phone</strong> (required)</li>
                  <li>• Address, School Grade, Notes (optional)</li>
                </ul>
              </div>

              {importing && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Importing children...</p>
                </div>
              )}

              {importResults && (
                <div className="space-y-3">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="font-medium text-green-800">
                      Successfully imported: {importResults.success} children
                    </p>
                  </div>
                  
                  {importResults.failed > 0 && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="font-medium text-red-800 mb-2">
                        Failed to import: {importResults.failed} children
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {importResults.errors.map((error, idx) => (
                          <p key={idx} className="text-sm text-red-600">
                            {error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={() => {
                      setImportResults(null);
                      setIsImportDialogOpen(false);
                    }}
                    className="w-full"
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Children List</CardTitle>
            <CardDescription>View and manage all children in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {children.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No children found. Add a child to get started.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Date of Birth</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {children.map((child) => (
                      <TableRow key={child.id}>
                        <TableCell className="font-medium">{child.full_name}</TableCell>
                        <TableCell>{child.date_of_birth}</TableCell>
                        <TableCell>{child.parent_name}</TableCell>
                        <TableCell>{child.parent_phone}</TableCell>
                        <TableCell>{child.school_grade || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={child.attendance_status === "Regular" ? "default" : "secondary"}>
                            {child.attendance_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/child-report/${child.id}`)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(child)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(child.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Children;
