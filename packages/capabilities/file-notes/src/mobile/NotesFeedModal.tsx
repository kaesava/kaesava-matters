import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  showMobileConfirm,
  useDateLocale,
  fmtDate,
} from '@money-matters/ui/mobile';
import { useFileNotesService } from '../context.js';
import { styles } from './NotesFeedModal.styles.js';

export interface NotesFeedModalProps {
  visible: boolean;
  onClose: () => void;
  entityType: 'ENVELOPE' | 'BANK_ACCOUNT';
  entityId: string;
  entityName: string;
}

export function NotesFeedModal({
  visible,
  onClose,
  entityType,
  entityId,
  entityName,
}: NotesFeedModalProps) {
  const service = useFileNotesService();
  const dateLocale = useDateLocale();
  const [noteComment, setNoteComment] = useState('');
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType?: string; size?: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState('');

  const { data: notes, refetch: refetchNotes } = service.useListQuery({
    entityType,
    entityId,
  });

  const createPresignedUrlMutation = service.useCreatePreSignedUrlMutation();
  const createNoteMutation = service.useCreateMutation();
  const updateCommentMutation = service.useUpdateCommentMutation();
  const purgeNoteMutation = service.usePurgeMutation();

  const handleSaveEdit = async (id: string) => {
    if (!editingComment.trim()) return;
    setErrorMessage(null);
    try {
      await updateCommentMutation.mutateAsync({ id, comment: editingComment.trim() });
      setEditingNoteId(null);
      setEditingComment('');
      await refetchNotes();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t('fileNotes.errors.updateFailed'));
    }
  };

  const isDirty = Boolean(noteComment.trim() || pickedFile);

  const handlePickDocument = async () => {
    try {
      setErrorMessage(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPickedFile({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType || 'application/octet-stream',
          size: asset.size,
        });
      }
    } catch {
      setErrorMessage(t('fileNotes.errors.pickFailed'));
    }
  };

  const handlePickImage = async () => {
    try {
      setErrorMessage(null);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const filename = asset.fileName || `receipt-${Date.now()}.jpg`;
        setPickedFile({
          uri: asset.uri,
          name: filename,
          mimeType: asset.mimeType || 'image/jpeg',
          size: asset.fileSize,
        });
      }
    } catch {
      setErrorMessage(t('fileNotes.errors.pickFailed'));
    }
  };

  const handlePostNote = async () => {
    if (!noteComment.trim() && !pickedFile) return;

    setIsUploading(true);
    setErrorMessage(null);
    try {
      let attachment = undefined;

      if (pickedFile) {
        const presigned = await createPresignedUrlMutation.mutateAsync({
          entityType,
          entityId,
          fileName: pickedFile.name,
          fileMimeType: pickedFile.mimeType || 'application/octet-stream',
          fileSize: pickedFile.size || 1024,
        });

        const fileBlobResponse = await fetch(pickedFile.uri);
        const blob = await fileBlobResponse.blob();

        const uploadRes = await fetch(presigned.uploadUrl, {
          method: 'PUT',
          body: blob,
          headers: {
            'Content-Type': pickedFile.mimeType || 'application/octet-stream',
          },
        });

        if (!uploadRes.ok) {
          throw new Error(t('fileNotes.errors.uploadFailed'));
        }

        attachment = {
          fileKey: presigned.fileKey,
          fileName: pickedFile.name,
          fileMimeType: pickedFile.mimeType || 'application/octet-stream',
          fileSize: pickedFile.size || 1024,
        };
      }

      await createNoteMutation.mutateAsync({
        entityType,
        entityId,
        comment: noteComment.trim() || undefined,
        attachment,
      });

      setNoteComment('');
      setPickedFile(null);
      refetchNotes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('fileNotes.errors.createFailed');
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (noteId: string) => {
    try {
      const { downloadUrl } = await service.getDownloadUrl(noteId);
      await Linking.openURL(downloadUrl);
    } catch {
      setErrorMessage(t('fileNotes.errors.downloadFailed'));
    }
  };

  const handleConfirmPurge = (noteId: string) => {
    showMobileConfirm({
      title: t('fileNotes.confirmPurgeTitle'),
      message: t('fileNotes.confirmPurgeDesc'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      isDestructive: true,
      onConfirm: async () => {
        try {
          await purgeNoteMutation.mutateAsync({ id: noteId });
          refetchNotes();
        } catch {
          setErrorMessage(t('fileNotes.errors.purgeFailed'));
        }
      },
    });
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={entityName}
      subtitle={t('fileNotes.drawerSubtitle')}
      isDirty={isDirty}
    >
      <View style={styles.container}>
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Input area */}
        <View style={styles.formContainer}>
          <TextInput
            value={noteComment}
            onChangeText={setNoteComment}
            placeholder={t('fileNotes.inputPlaceholder')}
            placeholderTextColor={DESIGN_TOKENS.colors.slate[400]}
            style={styles.textInput}
            multiline
            numberOfLines={3}
          />

          {pickedFile && (
            <View style={styles.pickedFilePill}>
              <Feather name="paperclip" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
              <Text style={styles.pickedFileName} numberOfLines={1}>
                {pickedFile.name}
              </Text>
              <TouchableOpacity onPress={() => setPickedFile(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={14} color={DESIGN_TOKENS.colors.slate[400]} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.actionsRow}>
            <View style={styles.attachButtons}>
              <TouchableOpacity onPress={handlePickDocument} style={styles.attachButton} activeOpacity={0.7}>
                <Feather name="file" size={16} color={DESIGN_TOKENS.colors.slate[600]} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePickImage} style={styles.attachButton} activeOpacity={0.7}>
                <Feather name="camera" size={16} color={DESIGN_TOKENS.colors.slate[600]} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handlePostNote}
              disabled={!isDirty || isUploading}
              style={[
                styles.submitButton,
                (!isDirty || isUploading) && styles.submitButtonDisabled,
              ]}
              activeOpacity={0.8}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color={DESIGN_TOKENS.colors.onAccent} />
              ) : (
                <Text style={styles.submitButtonText}>{t('fileNotes.addNoteButton')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes feed */}
        <ScrollView style={styles.feedScroll} showsVerticalScrollIndicator={false}>
          {(!notes || notes.length === 0) ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('fileNotes.emptyState')}</Text>
            </View>
          ) : (
            notes.map((note) => {
              const formattedSize = note.fileSize
                ? `${(parseInt(note.fileSize, 10) / 1024 / 1024).toFixed(2)} MB`
                : null;

              return (
                <View key={note.id} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <View>
                      <Text style={styles.noteAuthor}>{note.creatorName}</Text>
                      <Text style={styles.noteDate}>
                        {fmtDate(note.createdAt, dateLocale.timeZone, dateLocale.locale)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingNoteId(note.id);
                          setEditingComment(note.comment ?? '');
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="edit-2" size={14} color={DESIGN_TOKENS.colors.slate[400]} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleConfirmPurge(note.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="trash-2" size={14} color={DESIGN_TOKENS.colors.slate[400]} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {editingNoteId === note.id ? (
                    <View style={{ gap: 8, marginTop: 6 }}>
                      <TextInput
                        value={editingComment}
                        onChangeText={setEditingComment}
                        style={styles.textInput}
                        multiline
                      />
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                        <TouchableOpacity onPress={() => setEditingNoteId(null)}>
                          <Text style={styles.noteDate}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleSaveEdit(note.id)} disabled={updateCommentMutation.isPending}>
                          <Text style={[styles.noteAuthor, { color: DESIGN_TOKENS.colors.sereneBlue }]}>{t('common.save')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : note.comment ? (
                    <Text style={styles.noteComment}>{note.comment}</Text>
                  ) : null}

                  {note.fileKey && (
                    <TouchableOpacity
                      onPress={() => handleDownload(note.id)}
                      style={styles.attachmentPill}
                      activeOpacity={0.7}
                    >
                      <Feather name="paperclip" size={14} color={DESIGN_TOKENS.colors.slate[500]} />
                      <View style={styles.attachmentMeta}>
                        <Text style={styles.attachmentName} numberOfLines={1}>
                          {note.fileName}
                        </Text>
                        <Text style={styles.attachmentSize}>{formattedSize}</Text>
                      </View>
                      <Feather name="download" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </MobileModalDialog>
  );
}

