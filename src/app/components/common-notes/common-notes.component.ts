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
  CreateCommonNoteDto
} from '../../models/common-note.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialogRef } from '@angular/material/dialog';
import { Optional } from '@angular/core';
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
  newNoteText = '';
  isCollapsed = false;

  private destroy$ = new Subject<void>();

  constructor(
  private commonNoteService: CommonNoteService,
  @Optional() private dialogRef?: MatDialogRef<CommonNotesComponent>
  ) {}

  ngOnInit(): void {
    if (!this.entityType || !this.entityId) return;
    this.loadNotes();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const entityChanged =
      (changes['entityId'] || changes['entityType']) &&
      this.entityId &&
      this.entityId.trim() !== '';

    if (entityChanged) {
      this.loadNotes();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNotes(): void {
    if (!this.entityType || !this.entityId) return;

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
        },
        error: () => {
          this.error = 'Failed to load notes';
          this.isLoading = false;
        }
      });
  }

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
          this.notes.unshift(newNote);
          this.newNoteText = '';
          this.showForm = false;
          this.error = null;
        },
        error: () => {
          this.error = 'Failed to create note';
        }
      });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) this.newNoteText = '';
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  closeDialog(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return (
      d.toLocaleDateString() +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  }

  getNotesCount(): number {
    return this.notes.length;
  }
}