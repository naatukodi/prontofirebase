import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { CommonNote, CreateCommonNoteDto, UpdateCommonNoteDto } from '../models/common-note.model';

@Injectable({
  providedIn: 'root'
})
export class CommonNoteService {
  private apiUrl = 'http://localhost:5221/api/commonnote';
  private notesCache = new Map<string, BehaviorSubject<CommonNote[]>>();

  constructor(private http: HttpClient) { }

  private getCacheKey(entityType: string, entityId: string): string {
    return `${entityType}_${entityId}`;
  }

  // Get all notes
  getAllNotes(): Observable<CommonNote[]> {
    return this.http.get<CommonNote[]>(this.apiUrl);
  }

  // Get notes by entity type and ID with caching
  getNotesByEntity(entityType: string, entityId: string): Observable<CommonNote[]> {
    const cacheKey = this.getCacheKey(entityType, entityId);
    
    if (!this.notesCache.has(cacheKey)) {
      const subject = new BehaviorSubject<CommonNote[]>([]);
      this.notesCache.set(cacheKey, subject);

      // ✅ FIXED: Use ONLY the object syntax
      this.http.get<CommonNote[]>(
        `${this.apiUrl}/entity/${entityType}/${entityId}`
      ).subscribe({
        next: (notes: CommonNote[]) => {
          console.log('Notes loaded:', notes);
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

  // Get single note by ID
  getNoteById(id: string): Observable<CommonNote> {
    return this.http.get<CommonNote>(`${this.apiUrl}/${id}`);
  }

  // Create new note
  createNote(createDto: CreateCommonNoteDto): Observable<CommonNote> {
    console.log('Creating note:', createDto);
    return this.http.post<CommonNote>(this.apiUrl, createDto);
  }

  // Update note
  updateNote(id: string, updateDto: UpdateCommonNoteDto): Observable<CommonNote> {
    return this.http.put<CommonNote>(`${this.apiUrl}/${id}`, updateDto);
  }

  // Delete note
  deleteNote(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Clear cache for specific entity
  clearCache(entityType: string, entityId: string): void {
    const cacheKey = this.getCacheKey(entityType, entityId);
    this.notesCache.delete(cacheKey);
  }

  // Clear all cache
  clearAllCache(): void {
    this.notesCache.clear();
  }
}
