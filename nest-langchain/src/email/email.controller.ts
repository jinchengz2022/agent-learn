import { Controller, Get, Post, Query } from '@nestjs/common';
import { EmailService } from './email.service.js';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post()
  create() {
    return '';
  }

  @Get('send')
  async sendHtml(@Query('address') address: string) {
    const code = Math.random().toString().substring(2, 8);

    await this.emailService.sendMail({
      to: address,
      subject: 'hello' + code,
    });

    return {
      data: true,
      message: '',
    };
  }
}
