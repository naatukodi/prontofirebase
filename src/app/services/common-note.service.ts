import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { CommonNote, CreateCommonNoteDto, UpdateCommonNoteDto } from '../models/common-note.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommonNoteService {

  
  private apiUrl = `${environment.apiBaseUrl}CommonNote`;

  private notesCache = new Map<string, BehaviorSubject<CommonNote[]>>();

  constructor(private http: HttpClient) {}

  private getCacheKey(entityType: string, entityId: string): string {
    return `${entityType}_${entityId}`;
  }

  // Get all notes
  getAllNotes(): Observable<CommonNote[]> {
    return this.http.get<CommonNote[]>(this.apiUrl);
  }

  // Get notes by entity type and ID (with caching)
  getNotesByEntity(entityType: string, entityId: string): Observable<CommonNote[]> {
    const cacheKey = this.getCacheKey(entityType, entityId);

    if (!this.notesCache.has(cacheKey)) {
      const subject = new BehaviorSubject<CommonNote[]>([]);
      this.notesCache.set(cacheKey, subject);

      this.http.get<CommonNote[]>(
        `${this.apiUrl}/entity/${entityType}/${entityId}`
      ).subscribe({
        next: (notes: CommonNote[]) => {
          console.log('Notes loaded from API:', notes);
          subject.next(notes);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error fetching notes:', error);
          subject.error(error);
        }
      });
    }

    return this.notesCache.get(cacheKey)!.asObservable();
  }

  // Get a single note
  getNoteById(id: string): Observable<CommonNote> {
    return this.http.get<CommonNote>(`${this.apiUrl}/${id}`);
  }

  // Create a new note
  createNote(createDto: CreateCommonNoteDto): Observable<CommonNote> {
    console.log('Creating note:', createDto);
    return this.http.post<CommonNote>(this.apiUrl, createDto);
  }

  // Update existing note
  updateNote(id: string, updateDto: UpdateCommonNoteDto): Observable<CommonNote> {
    return this.http.put<CommonNote>(`${this.apiUrl}/${id}`, updateDto);
  }

  // Delete note
  deleteNote(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Clear specific cache
  clearCache(entityType: string, entityId: string): void {
    const cacheKey = this.getCacheKey(entityType, entityId);
    this.notesCache.delete(cacheKey);
  }

  // Clear all caches
  clearAllCache(): void {
    this.notesCache.clear();
  }
}
