import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  BookOpen,
  Image,
  TrendingUp,
  Mail,
  UserPlus,
  Trash2,
  Send,
  Shield,
  RefreshCw,
  Clock,
  FileText,
  Link,
  PenTool,
  Pencil,
  Download,
  Package,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const ADMIN_EMAIL = "loicchampanay@gmail.com";

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Create user dialog
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", name: "", password: "" });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  
  // Delete user dialog
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  
  // Email dialog
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailData, setEmailData] = useState({ subject: "", message: "", recipient_emails: [] });
  const [emailRecipient, setEmailRecipient] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendToAll, setSendToAll] = useState(false);

  // Edit user dialog
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [editUserData, setEditUserData] = useState({ name: "", email: "" });
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Send data dialog
  const [sendDataOpen, setSendDataOpen] = useState(false);
  const [userToSendData, setUserToSendData] = useState(null);
  const [isSendingData, setIsSendingData] = useState(false);

  // Check admin access
  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (user.email !== ADMIN_EMAIL) {
      toast.error("Accès réservé à l'administrateur");
      navigate("/");
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/admin/users`)
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
    } catch (error) {
      toast.error("Erreur lors du chargement des données");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    toast.success("Données actualisées");
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.email || !newUser.name || !newUser.password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    
    setIsCreatingUser(true);
    try {
      await axios.post(`${API}/admin/users`, newUser);
      toast.success(`Utilisateur ${newUser.email} créé`);
      setCreateUserOpen(false);
      setNewUser({ email: "", name: "", password: "" });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeletingUser(true);
    try {
      await axios.delete(`${API}/admin/users/${userToDelete.id}`);
      toast.success(`Utilisateur ${userToDelete.email} supprimé`);
      setDeleteUserOpen(false);
      setUserToDelete(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la suppression");
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!userToEdit) return;
    
    setIsUpdatingUser(true);
    try {
      await axios.put(`${API}/admin/users/${userToEdit.id}`, editUserData);
      toast.success("Utilisateur mis à jour");
      setEditUserOpen(false);
      setUserToEdit(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la mise à jour");
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const openEditDialog = (u) => {
    setUserToEdit(u);
    setEditUserData({ name: u.name, email: u.email });
    setEditUserOpen(true);
  };

  const handleSendUserData = async () => {
    if (!userToSendData) return;
    
    setIsSendingData(true);
    try {
      await axios.post(`${API}/admin/users/${userToSendData.id}/send-data`);
      toast.success(`Données envoyées à ${userToSendData.email}`);
      setSendDataOpen(false);
      setUserToSendData(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setIsSendingData(false);
    }
  };

  const handleExportUserData = async (userId) => {
    try {
      const response = await axios.get(`${API}/admin/users/${userId}/export`);
      const dataStr = JSON.stringify(response.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${userId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export téléchargé");
    } catch (error) {
      toast.error("Erreur lors de l'export");
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailData.subject || !emailData.message) {
      toast.error("Veuillez remplir le sujet et le message");
      return;
    }
    
    if (!sendToAll && emailData.recipient_emails.length === 0) {
      toast.error("Veuillez ajouter au moins un destinataire");
      return;
    }
    
    setIsSendingEmail(true);
    try {
      const endpoint = sendToAll ? `${API}/admin/email/all` : `${API}/admin/email`;
      const response = await axios.post(endpoint, emailData);
      toast.success(response.data.message);
      setEmailOpen(false);
      setEmailData({ subject: "", message: "", recipient_emails: [] });
      setSendToAll(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const addEmailRecipient = () => {
    if (emailRecipient && !emailData.recipient_emails.includes(emailRecipient)) {
      setEmailData({
        ...emailData,
        recipient_emails: [...emailData.recipient_emails, emailRecipient]
      });
      setEmailRecipient("");
    }
  };

  const removeEmailRecipient = (email) => {
    setEmailData({
      ...emailData,
      recipient_emails: emailData.recipient_emails.filter(e => e !== email)
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getSourceIcon = (type) => {
    switch (type) {
      case "url": return <Link className="w-4 h-4" />;
      case "manual": return <PenTool className="w-4 h-4" />;
      case "document": return <FileText className="w-4 h-4" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4" data-testid="admin-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-semibold text-foreground">Administration</h1>
              <p className="text-sm text-stone-600">Tableau de bord et gestion</p>
            </div>
          </div>
          <Button onClick={refreshData} variant="outline" disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-600">Utilisateurs</p>
                  <p className="text-3xl font-bold text-foreground">{stats?.total_users || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-600">Recettes</p>
                  <p className="text-3xl font-bold text-foreground">{stats?.total_recipes || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-600">Images</p>
                  <p className="text-3xl font-bold text-foreground">{stats?.total_images || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Image className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-600">Sources</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">URL: {stats?.recipes_by_source?.url || 0}</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Manuel: {stats?.recipes_by_source?.manual || 0}</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Clock className="w-4 h-4 mr-2" />
              Activité
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              Emailing
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Gestion des utilisateurs</CardTitle>
                  <CardDescription>Ajouter, modifier ou supprimer des comptes (RGPD)</CardDescription>
                </div>
                <Button onClick={() => setCreateUserOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Nouveau
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Recettes</TableHead>
                      <TableHead>Inscription</TableHead>
                      <TableHead className="w-40">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>
                          {u.email}
                          {u.email === ADMIN_EMAIL && (
                            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Admin</span>
                          )}
                        </TableCell>
                        <TableCell>{u.recipe_count || 0}</TableCell>
                        <TableCell>{formatDate(u.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {/* Edit button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => openEditDialog(u)}
                              title="Modifier (Droit de rectification)"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {/* Export data */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleExportUserData(u.id)}
                              title="Télécharger les données"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {/* Send data by email */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              onClick={() => { setUserToSendData(u); setSendDataOpen(true); }}
                              title="Envoyer les données par email"
                            >
                              <Package className="w-4 h-4" />
                            </Button>
                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => { setUserToDelete(u); setDeleteUserOpen(true); }}
                              disabled={u.email === ADMIN_EMAIL}
                              title="Supprimer (Droit à l'effacement)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Derniers inscrits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.recent_users?.map((u, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-sm text-stone-600">{u.email}</p>
                        </div>
                        <p className="text-xs text-stone-500">{formatDate(u.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Dernières recettes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.recent_recipes?.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {getSourceIcon(r.source_type)}
                          <p className="font-medium">{r.title}</p>
                        </div>
                        <p className="text-xs text-stone-500">{formatDate(r.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Envoyer un email
                </CardTitle>
                <CardDescription>
                  Communiquez avec vos utilisateurs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendEmail} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Destinataires</Label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id="sendToAll"
                        checked={sendToAll}
                        onChange={(e) => setSendToAll(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="sendToAll" className="text-sm">
                        Envoyer à tous les utilisateurs ({stats?.total_users || 0})
                      </label>
                    </div>
                    
                    {!sendToAll && (
                      <>
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="Ajouter un email..."
                            value={emailRecipient}
                            onChange={(e) => setEmailRecipient(e.target.value)}
                          />
                          <Button type="button" variant="outline" onClick={addEmailRecipient}>
                            Ajouter
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {emailData.recipient_emails.map((email) => (
                            <span 
                              key={email} 
                              className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                            >
                              {email}
                              <button type="button" onClick={() => removeEmailRecipient(email)}>
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subject">Sujet</Label>
                    <Input
                      id="subject"
                      placeholder="Sujet de l'email..."
                      value={emailData.subject}
                      onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Votre message..."
                      value={emailData.message}
                      onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                      rows={6}
                      required
                    />
                  </div>
                  
                  <Button type="submit" disabled={isSendingEmail} className="w-full">
                    {isSendingEmail ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Envoyer
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create User Dialog */}
      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un utilisateur</DialogTitle>
            <DialogDescription>
              Ajoutez un nouveau compte utilisateur
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Prénom</Label>
              <Input
                id="new-name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateUserOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isCreatingUser}>
                {isCreatingUser ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteUserOpen} onOpenChange={setDeleteUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'utilisateur</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{userToDelete?.email}</strong> ?
              <br />
              <span className="text-red-600">Cette action supprimera également toutes ses recettes et images.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeletingUser}>
              {isDeletingUser ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
