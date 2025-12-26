declare module 'expo-file-system' {
  export const documentDirectory: string | null;
  export const cacheDirectory: string | null;
  export const bundleDirectory: string | null;

  export enum EncodingType {
    UTF8 = 'utf8',
    Base64 = 'base64',
  }

  export interface FileInfo {
    exists: boolean;
    uri: string;
    size?: number;
    isDirectory?: boolean;
    modificationTime?: number;
    md5?: string;
  }

  export interface DownloadOptions {
    md5?: boolean;
    cache?: boolean;
    headers?: Record<string, string>;
  }

  export interface DownloadResult {
    uri: string;
    status: number;
    headers: Record<string, string>;
    md5?: string;
  }

  export interface DownloadProgressData {
    totalBytesWritten: number;
    totalBytesExpectedToWrite: number;
  }

  export interface DownloadProgressCallback {
    (data: DownloadProgressData): void;
  }

  export interface UploadOptions {
    headers?: Record<string, string>;
    httpMethod?: 'POST' | 'PUT' | 'PATCH';
    sessionType?: 'background' | 'foreground';
    uploadType?: 'BINARY_CONTENT' | 'MULTIPART';
    fieldName?: string;
    mimeType?: string;
    parameters?: Record<string, string>;
  }

  export interface UploadResult {
    status: number;
    headers: Record<string, string>;
    body: string;
  }

  export interface UploadProgressData {
    totalBytesSent: number;
    totalBytesExpectedToSend: number;
  }

  export interface UploadProgressCallback {
    (data: UploadProgressData): void;
  }

  export interface ReadingOptions {
    encoding?: EncodingType | 'utf8' | 'base64';
    length?: number;
    position?: number;
  }

  export interface WritingOptions {
    encoding?: EncodingType | 'utf8' | 'base64';
  }

  export interface DeletingOptions {
    idempotent?: boolean;
  }

  export interface RelocatingOptions {
    from: string;
    to: string;
  }

  export function getInfoAsync(
    fileUri: string,
    options?: { md5?: boolean; size?: boolean }
  ): Promise<FileInfo>;

  export function readAsStringAsync(
    fileUri: string,
    options?: ReadingOptions
  ): Promise<string>;

  export function writeAsStringAsync(
    fileUri: string,
    contents: string,
    options?: WritingOptions
  ): Promise<void>;

  export function deleteAsync(
    fileUri: string,
    options?: DeletingOptions
  ): Promise<void>;

  export function moveAsync(options: RelocatingOptions): Promise<void>;

  export function copyAsync(options: RelocatingOptions): Promise<void>;

  export function makeDirectoryAsync(
    fileUri: string,
    options?: { intermediates?: boolean }
  ): Promise<void>;

  export function readDirectoryAsync(fileUri: string): Promise<string[]>;

  export function downloadAsync(
    uri: string,
    fileUri: string,
    options?: DownloadOptions
  ): Promise<DownloadResult>;

  export function uploadAsync(
    url: string,
    fileUri: string,
    options?: UploadOptions
  ): Promise<UploadResult>;

  export function createDownloadResumable(
    uri: string,
    fileUri: string,
    options?: DownloadOptions,
    callback?: DownloadProgressCallback,
    resumeData?: string
  ): DownloadResumable;

  export class DownloadResumable {
    constructor(
      url: string,
      fileUri: string,
      options?: DownloadOptions,
      callback?: DownloadProgressCallback,
      resumeData?: string
    );

    downloadAsync(): Promise<DownloadResult | undefined>;
    pauseAsync(): Promise<void>;
    resumeAsync(): Promise<DownloadResult | undefined>;
    savable(): { url: string; fileUri: string; options: DownloadOptions; resumeData: string };
  }

  export const FileSystemUploadType: {
    BINARY_CONTENT: 0;
    MULTIPART: 1;
  };

  export const FileSystemSessionType: {
    BACKGROUND: 0;
    FOREGROUND: 1;
  };
}
