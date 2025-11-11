import {
  Component,
  OnInit,
  Input,
  OnDestroy,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonNoteService } from '../../services/common-note.service';
import {
  CommonNote,
  CreateCommonNoteDto,
  UpdateCommonNoteDto
} from '../../models/common-note.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-common-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './common-notes.component.html',
  styleUrls: ['./common-notes.component.css']
})
export class CommonNotesComponent
  implements OnInit, OnChanges, OnDestroy
{
  @Input() entityType: string = '';
  @Input() entityId: string = '';
  @Input() currentUser: string = '';
  @Input() showHeader = true;
  @Input() collapsible = false;

  notes: CommonNote[] = [];
  isLoading = false;
  error: string | null = null;
  showForm = false;
  editingNoteId: string | null = null;
  newNoteText = '';
  editNoteText = '';
  isCollapsed = false;

  private destroy$ = new Subject<void>();

  constructor(private commonNoteService: CommonNoteService) {}

  ngOnInit(): void {
  console.log('🔍 CommonNotesComponent initialized with:', {
    entityType: this.entityType,
    entityId: this.entityId
  });

  if (!this.entityType || !this.entityId) {
    console.error('❌ CommonNotesComponent: entityType and entityId are required');
    return;
  }

  this.loadNotes();
}

  ngOnChanges(changes: SimpleChanges): void {
    // prevent premature load
    const entityIdChanged =
      changes['entityId'] &&
      changes['entityId'].currentValue &&
      changes['entityId'].currentValue !==
        changes['entityId'].previousValue;

    const entityTypeChanged =
      changes['entityType'] &&
      changes['entityType'].currentValue &&
      changes['entityType'].currentValue !==
        changes['entityType'].previousValue;

    if ((entityIdChanged || entityTypeChanged) && this.entityId && this.entityId.trim() !== '') {
      console.log(
        'Entity data ready → loading notes for:',
        this.entityType,
        this.entityId
      );
      this.loadNotes();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ Load all notes for current entity
  loadNotes(): void {
    if (!this.entityType || !this.entityId || this.entityId.trim() === '') {
      console.warn('Skipping note load — invalid entity info');
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.commonNoteService
      .getNotesByEntity(this.entityType, this.entityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.notes = data.sort(
            (a, b) =>
              new Date(b.createdDate).getTime() -
              new Date(a.createdDate).getTime()
          );
          this.isLoading = false;
          console.log('Notes loaded:', this.notes);
        },
        error: (err) => {
          console.error('Error loading notes:', err);
          this.error = 'Failed to load notes';
          this.isLoading = false;
        }
      });
  }

  // ✅ Create new note
  createNote(): void {
    if (!this.newNoteText.trim()) {
      this.error = 'Note cannot be empty';
      return;
    }

    const createDto: CreateCommonNoteDto = {
      entityType: this.entityType,
      entityId: this.entityId,
      note: this.newNoteText,
      createdBy: this.currentUser
    };

    this.commonNoteService
      .createNote(createDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newNote) => {
          // Add locally for instant update
          this.notes.unshift(newNote);

          // (optional) refresh from DB for sync
          // this.loadNotes();

          this.newNoteText = '';
          this.showForm = false;
          this.error = null;
        },
        error: (err) => {
          console.error('Error creating note:', err);
          this.error = 'Failed to create note';
        }
      });
  }

  startEditing(note: CommonNote): void {
    this.editingNoteId = note.id;
    this.editNoteText = note.note;
  }

  cancelEditing(): void {
    this.editingNoteId = null;
    this.editNoteText = '';
  }

  updateNote(noteId: string): void {
    if (!this.editNoteText.trim()) {
      this.error = 'Note cannot be empty';
      return;
    }

    const updateDto: UpdateCommonNoteDto = {
      note: this.editNoteText,
      modifiedBy: this.currentUser
    };

    this.commonNoteService
      .updateNote(noteId, updateDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedNote) => {
          const index = this.notes.findIndex((n) => n.id === noteId);
          if (index !== -1) {
            this.notes[index] = updatedNote;
          }
          this.cancelEditing();
          this.error = null;
        },
        error: (err) => {
          console.error('Error updating note:', err);
          this.error = 'Failed to update note';
        }
      });
  }

  deleteNote(noteId: string): void {
    if (confirm('Are you sure you want to delete this note?')) {
      this.commonNoteService
        .deleteNote(noteId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notes = this.notes.filter((n) => n.id !== noteId);
            this.error = null;
          },
          error: (err) => {
            console.error('Error deleting note:', err);
            this.error = 'Failed to delete note';
          }
        });
    }
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.newNoteText = '';
    }
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return (
      d.toLocaleDateString() +
      ' ' +
      d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    );
  }

  getNotesCount(): number {
    return this.notes.length;
  }
}
