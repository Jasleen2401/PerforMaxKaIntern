import { useState, useEffect } from "react";
import { useGetCurrentUserQuery, useUpdateProfileMutation, useChangePasswordMutation, useUploadProfileImageMutation } from "../features/employee/employeeapi";
import { toast } from "react-toastify";
import { validatePassword } from "../utils/validation";
import type { UpdateProfileRequest, MaritalStatus } from "../features/employee/employeeTypes";
import { User, Lock } from "lucide-react";

const AVATAR_COLORS = [
  { bg: "#EEF3FD", text: "#0C447C" },
  { bg: "#EAF3DE", text: "#27500A" },
  { bg: "#FAEEDA", text: "#633806" },
  { bg: "#F1EFE8", text: "#444441" },
  { bg: "#FCEBEB", text: "#791F1F" },
];

const inputStyle: React.CSSProperties = {
  background: "#F5F6F8", border: "0.5px solid #E0E2E8", borderRadius: 8,
  padding: "7px 12px", fontSize: 13, color: "#111827", fontFamily: "inherit", outline: "none", width: "100%",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 500, color: "#9EA3B0",
  textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5,
};

const panelStyle: React.CSSProperties = {
  background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px",
};

const EditProfilePage = () => {
  const { data: profile, isLoading } = useGetCurrentUserQuery();
  const [updateProfile] = useUpdateProfileMutation();
  const [changePassword] = useChangePasswordMutation();
  const [uploadProfileImage] = useUploadProfileImageMutation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageTimestamp, setImageTimestamp] = useState(() => Date.now());
  const [fileInputKey, setFileInputKey] = useState(0);

  

  const [formData, setFormData] = useState<UpdateProfileRequest>({
    staffName: "", otherName: "", email: "", phoneNo: "",
    contactAddress: "", permanentAddress: "", maritalStatus: undefined,
    spouseName: "", fatherName: "",
  });

  const [passwordData, setPasswordData] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    if (profile) {
      // Profile data arrives asynchronously; keep the edit form in sync with it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        staffName: profile.staffName || "",
        otherName: profile.otherName || "",
        email: profile.email || "",
        phoneNo: profile.phoneNo || "",
        contactAddress: profile.contactAddress || "",
        permanentAddress: profile.permanentAddress || "",
        maritalStatus: profile.maritalStatus || undefined,
        spouseName: profile.spouseName || "",
        fatherName: profile.fatherName || "",
      });
    }
  }, [profile]);

  

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(formData).unwrap();
      if (selectedFile && profile?.id) {
        await uploadProfileImage({ id: profile.id, file: selectedFile }).unwrap();
        setImageTimestamp(Date.now());
        setSelectedFile(null);
        setFileInputKey(prev => prev + 1);
      }
      toast.success("Profile updated successfully!");
    } catch {
      toast.error("Failed to update profile.");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.warning("Passwords do not match!");
      return;
    }
    
    const validationError = validatePassword(passwordData.newPassword);
    if (validationError) {
      toast.warning(validationError);
      return;
    }

    try {
      await changePassword({ id: profile.id, body: passwordData }).unwrap();
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully!");
    } catch {
      toast.error("Failed to change password.");
    }
  };

  if (isLoading) return <div className="py-16 text-center" style={{ color: "#9EA3B0", fontSize: 13 }}>Loading profile...</div>;

  const avatarColor = AVATAR_COLORS[(profile?.staffName?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];

  return (
    <div className="space-y-4 pb-8">
      {/* Profile header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4" style={panelStyle}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: avatarColor.bg, color: avatarColor.text, fontSize: 20, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
          {profile?.profileImage && profile.profileImage !== "default.jpg" ? (
            <img src={`http://localhost:8000${profile.profileImage}?t=${imageTimestamp}`} alt={profile.staffName} className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : profile?.staffName.charAt(0)}
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: "#111827" }}>{profile?.staffName}</h1>
          <p style={{ fontSize: 12, color: "#1A56DB", marginTop: 2 }}>{profile?.positionName} / {profile?.currentDepartmentName}</p>
          {/* removed cycle selector — moved to admin EmployeeProfileView */}
        </div>
      </div>

      <div className="space-y-4">
          {/* Personal information */}
          <div style={panelStyle}>
            <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
              <User size={15} style={{ color: "#1A56DB" }} aria-hidden="true" />
              <p style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>Personal information</p>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Full name</label>
                  <input style={inputStyle} type="text" value={formData.staffName} onChange={(e) => setFormData({ ...formData, staffName: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Other name</label>
                  <input style={inputStyle} type="text" value={formData.otherName || ""} onChange={(e) => setFormData({ ...formData, otherName: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input style={inputStyle} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input style={inputStyle} type="text" value={formData.phoneNo} onChange={(e) => setFormData({ ...formData, phoneNo: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Father's name</label>
                  <input style={inputStyle} type="text" value={formData.fatherName || ""} onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Marital status</label>
                  <select style={inputStyle} value={formData.maritalStatus || ""} onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value as MaritalStatus })}>
                    <option value="">Select</option>
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="DIVORCED">Divorced</option>
                    <option value="WIDOWED">Widowed</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label style={labelStyle}>Spouse name</label>
                  <input style={inputStyle} type="text" value={formData.spouseName || ""} onChange={(e) => setFormData({ ...formData, spouseName: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label style={labelStyle}>Contact address</label>
                  <textarea style={{ ...inputStyle, height: 72, resize: "none" }} value={formData.contactAddress || ""} onChange={(e) => setFormData({ ...formData, contactAddress: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label style={labelStyle}>Permanent address</label>
                  <textarea style={{ ...inputStyle, height: 72, resize: "none" }} value={formData.permanentAddress || ""} onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label style={labelStyle}>Profile image</label>
                  <input key={fileInputKey} type="file" accept="image/*" style={{ ...inputStyle, padding: "5px 12px" }}
                    onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} />
                </div>
              </div>
              <button type="submit"
                className="transition-colors"
                style={{ background: "#1A56DB", color: "#FFFFFF", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500, border: "none" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#1648C0"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#1A56DB"; }}>
                Update information
              </button>
            </form>
          </div>

          {/* Security */}
          <div style={panelStyle}>
            <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
              <Lock size={15} style={{ color: "#1A56DB" }} aria-hidden="true" />
              <p style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>Security settings</p>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label style={labelStyle}>Current password</label>
                <input style={inputStyle} type="password" required value={passwordData.oldPassword} onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>New password</label>
                  <input style={inputStyle} type="password" required value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Confirm new password</label>
                  <input style={inputStyle} type="password" required value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} />
                </div>
              </div>
              <button type="submit"
                className="transition-colors"
                style={{ background: "#111827", color: "#FFFFFF", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500, border: "none" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#1F2937"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#111827"; }}>
                Change password
              </button>
            </form>
          </div>
      </div>
    </div>
  );
};

export default EditProfilePage;
