"use client";

import { useState } from "react";
import { Mail, Edit, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useGetTemplatesQuery, useUpdateTemplateMutation, type NotificationTemplate } from "@/features/admin/adminApi";

export default function AdminTemplatesPage() {
  const { data, isLoading, refetch } = useGetTemplatesQuery();
  const [updateTemplate, { isLoading: isUpdating }] = useUpdateTemplateMutation();
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

  const [subjectInput, setSubjectInput] = useState("");
  const [bodyInput, setBodyInput] = useState("");

  const templates = data?.data ?? [];

  function handleStartEdit(template: NotificationTemplate) {
    setEditingTemplate(template);
    setSubjectInput(template.subject ?? "");
    setBodyInput(template.body);
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTemplate || !bodyInput) {
      toast.error("Template body cannot be empty.");
      return;
    }

    try {
      const res = await updateTemplate({
        type: editingTemplate.type,
        channel: editingTemplate.channel,
        locale: editingTemplate.locale,
        subject: editingTemplate.channel === "EMAIL" ? subjectInput : undefined,
        body: bodyInput,
      }).unwrap();

      toast.success(res.message || "Template saved successfully.");
      setEditingTemplate(null);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to save template.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notification Templates</h1>
        <p className="text-muted-foreground">Modify transactional Email and SMS templates with placeholdings support.</p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm text-muted-foreground border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 font-semibold text-foreground">
                <th className="p-4">Template Type</th>
                <th className="p-4">Channel</th>
                <th className="p-4">Locale</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Body Preview</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    Loading templates...
                  </td>
                </tr>
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    No templates found in database.
                  </td>
                </tr>
              ) : (
                templates.map((tpl) => (
                  <tr key={`${tpl.type}-${tpl.channel}-${tpl.locale}`} className="border-b hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-semibold text-foreground">{tpl.type}</td>
                    <td className="p-4 uppercase text-xs font-semibold">{tpl.channel}</td>
                    <td className="p-4 uppercase text-xs">{tpl.locale}</td>
                    <td className="p-4 max-w-xs truncate">{tpl.subject || "-"}</td>
                    <td className="p-4 max-w-xs truncate">{tpl.body}</td>
                    <td className="p-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEdit(tpl)}
                        className="inline-flex items-center gap-1.5"
                      >
                        <Edit className="size-3.5" /> Edit Template
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Template Editor Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="text-primary size-5" /> Edit Template Configuration
              </CardTitle>
              <CardDescription>
                Customize layout for {editingTemplate.type} ({editingTemplate.channel} - {editingTemplate.locale}).
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveTemplate}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Input value={editingTemplate.type} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-1">
                    <Label>Channel</Label>
                    <Input value={editingTemplate.channel} readOnly className="bg-muted" />
                  </div>
                </div>

                {editingTemplate.channel === "EMAIL" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="subject">Email Subject</Label>
                    <Input
                      id="subject"
                      value={subjectInput}
                      onChange={(e) => setSubjectInput(e.target.value)}
                      placeholder="Enter subject line..."
                      required
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="body">Template Body (Supports HTML/Placetags)</Label>
                  <textarea
                    id="body"
                    rows={8}
                    value={bodyInput}
                    onChange={(e) => setBodyInput(e.target.value)}
                    placeholder="Enter template body content..."
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-2 p-6 border-t bg-muted/40 rounded-b-xl">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingTemplate(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={isUpdating}>
                  <Save className="size-4 mr-1.5" /> Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
