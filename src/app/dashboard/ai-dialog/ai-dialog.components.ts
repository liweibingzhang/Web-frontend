import { MarkdownModule } from 'ngx-markdown';
import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { materialModules } from '../../shared/material';
import { DeepSeekService } from '../../services/deeepseek.service';

@Component({
  selector: 'app-ai-dialog',
  imports: [CommonModule, FormsModule, MatDialogModule, materialModules, MarkdownModule],
  templateUrl: './ai-dialog.component.html',
  styleUrls: ['./ai-dialog.component.css']
})
export class AiDialogComponent {
  userInput: string = ''; // 用户输入
  aiResponse: string = ''; // AI 当前的响应
  dialogHistory: { from: string, message: string }[] = []; // 对话历史
  isLoading: boolean = false; // 是否正在加载
  markdownContent: string = 'test'; // markdown 内容
  constructor(
    public dialogRef: MatDialogRef<AiDialogComponent>, // 用于关闭对话框
    private deepseekService: DeepSeekService,
    @Inject(MAT_DIALOG_DATA) public data: any // 用于传递数据
  ) {}

  // 关闭对话框
  onClose(): void {
    this.dialogRef.close();
  }

  async getResponse() {
    const messages = []
    for (let i = 0; i < this.dialogHistory.length; i++) {
      messages.push({
        role: this.dialogHistory[i].from === 'User' ? 'user' : 'assistant',
        content: this.dialogHistory[i].message
      })
    }
    this.isLoading = true;
    this.deepseekService.chatCompletion(messages).subscribe(
      (response) => {
        this.dialogHistory.push({ from: 'AI', message: response.choices[0].message.content });
        this.isLoading = false;
      }
    )
  }
  // 模拟 AI 响应
  onSubmit() {
    if (this.userInput.trim()) {
      // 记录用户输入
      this.dialogHistory.push({ from: 'User', message: this.userInput });

      this.getResponse()
      // 清空用户输入框
      this.userInput = '';
    }
  }
}
