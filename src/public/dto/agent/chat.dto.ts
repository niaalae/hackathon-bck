import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

class ChatMessageDto {
    @IsString()
    role: 'user' | 'assistant';

    @IsString()
    content: string;
}

export class ChatDto {
    @IsString()
    @MinLength(1)
    message: string;

    @IsArray()
    @IsOptional()
    history?: ChatMessageDto[];
}
