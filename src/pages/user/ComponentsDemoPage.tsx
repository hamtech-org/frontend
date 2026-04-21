'use client';

import React, { useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Label,
  TooltipTrigger,
  TooltipContent,
  Tooltip,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogHeader,
} from '@/components/ui';
import { MessageCircle, Heart, Share2, MoreHorizontal, Trash2, Edit2 } from 'lucide-react';
import { MuteChatListDemo } from '@/components/chat/demo/MuteChatListDemo';
import { PinnedMutedChatListDemo } from '@/components/chat/demo/PinnedMutedChatListDemo';
import { SubtaskGroupTaskDemo } from '@/components/chat/demo/SubtaskGroupTaskDemo';

const ComponentsDemoPage: React.FC = () => {
  const [selectedRadio, setSelectedRadio] = useState('option1');
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({
    item1: false,
    item2: true,
    item3: false,
  });
  const [selectValue, setSelectValue] = useState('user');
  const [inputValue, setInputValue] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCheckChange = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">shadcn/ui Components Demo</h1>
          <p className="text-muted-foreground text-lg">
            Showcase của tất cả component đã cài đặt cho Zalogram UI refactor
          </p>
        </div>

        {/* Component Grid */}
        <div className="space-y-8">
          {/* 1. Button Component */}
          <Card>
            <CardHeader>
              <CardTitle>Button Component</CardTitle>
              <CardDescription>Multiple variants và sizes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  <Button variant="default">Default Button</Button>
                  <Button variant="outline">Outline Button</Button>
                  <Button variant="secondary">Secondary Button</Button>
                  <Button variant="ghost">Ghost Button</Button>
                  <Button variant="destructive">Destructive Button</Button>
                  <Button variant="link">Link Button</Button>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button size="xs">XS Size</Button>
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button disabled>Disabled</Button>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button size="icon">
                    <Heart className="w-4 h-4" />
                  </Button>
                  <Button>
                    <MessageCircle data-icon="inline-start" className="w-4 h-4" />
                    Comment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Card Component */}
          <Card>
            <CardHeader>
              <CardTitle>Card Component</CardTitle>
              <CardDescription>With Header, Title, Content, Footer</CardDescription>
            </CardHeader>
            <CardContent>
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Nested Card Example</CardTitle>
                  <CardDescription>Card có thể nested và sử dụng size variant</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    Nội dung bên trong card. Có thể chứa bất kỳ element nào.
                  </p>
                </CardContent>
                <CardFooter className="justify-between">
                  <Button variant="outline" size="sm">
                    Cancel
                  </Button>
                  <Button size="sm">Save</Button>
                </CardFooter>
              </Card>
            </CardContent>
          </Card>

          {/* 3. Input Component */}
          <Card>
            <CardHeader>
              <CardTitle>Input Component</CardTitle>
              <CardDescription>Text input với focus states</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="demo-input">E-mail</Label>
                <Input
                  id="demo-input"
                  placeholder="Enter your email..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-password">Password</Label>
                <Input id="demo-password" type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-disabled">Disabled Input</Label>
                <Input id="demo-disabled" placeholder="Cannot edit this" disabled />
              </div>
            </CardContent>
          </Card>

          {/* 4. Dialog Component */}
          <Card>
            <CardHeader>
              <CardTitle>Dialog Component</CardTitle>
              <CardDescription>Modal popup overlay</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dialog Title</DialogTitle>
                    <DialogDescription>
                      Đây là nội dung dialog. Có thể sử dụng cho modals, confirmations, v.v
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input placeholder="Nhập gì đó..." />
                    <div className="flex justify-end gap-2">
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button>Confirm</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* 5. Tabs Component */}
          <Card>
            <CardHeader>
              <CardTitle>Tabs Component</CardTitle>
              <CardDescription>Navigation tabs</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="friends" className="w-full">
                <TabsList>
                  <TabsTrigger value="friends">Bạn bè</TabsTrigger>
                  <TabsTrigger value="pending">Lời mời chờ</TabsTrigger>
                  <TabsTrigger value="blocked">Đã chặn</TabsTrigger>
                </TabsList>
                <TabsContent value="friends" className="p-4 border rounded-lg mt-4">
                  <p className="text-sm">Danh sách bạn bè của bạn sẽ hiển thị ở đây</p>
                </TabsContent>
                <TabsContent value="pending" className="p-4 border rounded-lg mt-4">
                  <p className="text-sm">3 lời mời chời đang chờ xử lý</p>
                </TabsContent>
                <TabsContent value="blocked" className="p-4 border rounded-lg mt-4">
                  <p className="text-sm">Không có ai bị chặn</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* 6. Avatar Component */}
          <Card>
            <CardHeader>
              <CardTitle>Avatar Component</CardTitle>
              <CardDescription>User avatar với fallback</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">Sarah Anderson</p>
                    <p className="text-sm text-muted-foreground">@sarah.anderson</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Avatar size="lg">
                    <AvatarImage src="https://github.com/vercel.png" alt="@vercel" />
                    <AvatarFallback>VL</AvatarFallback>
                  </Avatar>
                  <Avatar size="sm">
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 7. Badge Component */}
          <Card>
            <CardHeader>
              <CardTitle>Badge Component</CardTitle>
              <CardDescription>Status indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </CardContent>
          </Card>

          {/* 8. Popover Component */}
          <Card>
            <CardHeader>
              <CardTitle>Popover Component</CardTitle>
              <CardDescription>Context menu / dropdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48">
                    <div className="space-y-2">
                      <button className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-muted text-left text-sm">
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-muted text-left text-sm">
                        <Share2 className="w-4 h-4" />
                        Share
                      </button>
                      <button className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-destructive/10 text-left text-sm text-destructive">
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* 9. Select Component */}
          <Card>
            <CardHeader>
              <CardTitle>Select Component</CardTitle>
              <CardDescription>Dropdown selection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="select-demo">Choose a role</Label>
                <Select value={selectValue} onValueChange={setSelectValue}>
                  <SelectTrigger id="select-demo">
                    <SelectValue placeholder="Select an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Selected: <strong>{selectValue}</strong>
              </p>
            </CardContent>
          </Card>

          {/* 10. Checkbox Component */}
          <Card>
            <CardHeader>
              <CardTitle>Checkbox Component</CardTitle>
              <CardDescription>Multi-select items</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  { id: 'item1', label: 'Nhận thông báo tin nhắn' },
                  { id: 'item2', label: 'Bật âm thanh' },
                  { id: 'item3', label: 'Hiển thị trạng thái online' },
                ].map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Checkbox
                      id={item.id}
                      checked={checkedItems[item.id] || false}
                      onCheckedChange={() => handleCheckChange(item.id)}
                    />
                    <Label htmlFor={item.id} className="cursor-pointer">
                      {item.label}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Checked items:{' '}
                {Object.entries(checkedItems).filter(([, checked]) => checked).length}
              </p>
            </CardContent>
          </Card>

          {/* 11. RadioGroup Component */}
          <Card>
            <CardHeader>
              <CardTitle>RadioGroup Component</CardTitle>
              <CardDescription>Single selection options</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedRadio} onValueChange={setSelectedRadio}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="option1" id="radio-opt1" />
                  <Label htmlFor="radio-opt1" className="cursor-pointer">
                    Option 1 - Nhận tất cả thông báo
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="option2" id="radio-opt2" />
                  <Label htmlFor="radio-opt2" className="cursor-pointer">
                    Option 2 - Nhận từ bạn bè
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="option3" id="radio-opt3" />
                  <Label htmlFor="radio-opt3" className="cursor-pointer">
                    Option 3 - Không nhận thông báo
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-muted-foreground mt-4">
                Selected: <strong>{selectedRadio}</strong>
              </p>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-blue-500/50 bg-blue-500/5">
            <CardHeader>
              <CardTitle className="text-blue-700 dark:text-blue-400">
                ✓ Tất cả 11 Components đã cài thành công!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>✓ Button - Thay thế nút bấm cũ</li>
                <li>✓ Card - Container cho form, dialog content</li>
                <li>✓ Input - Form input fields</li>
                <li>✓ Dialog - Thay 10+ modals hiện tại</li>
                <li>✓ Tabs - Chat sidebar navigation</li>
                <li>✓ Avatar - User identity + fallback</li>
                <li>✓ Badge - Status indicators</li>
                <li>✓ Popover - Context menu actions</li>
                <li>✓ Select - Dropdown selections</li>
                <li>✓ Checkbox - Multi-select</li>
                <li>✓ RadioGroup - Single-select options</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-4">
                Tiếp theo: Refactor Auth forms, Chat modals, Sidebar navigation theo lộ trình đã lên
                kế hoạch
              </p>
            </CardContent>
          </Card>

          {/* Tooltip */}
          <Card>
            <CardHeader>
              <CardTitle>Tooltip Component</CardTitle>
              <CardDescription>Hover để xem tooltip</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">Hover me</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">Đây là tooltip nội dung</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          {/* Alert-dialog */}
          <Card>
            <CardHeader>
              <CardTitle>AlertDialog Component</CardTitle>
              <CardDescription>Confirmation dialog</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete Account</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you sure you want to delete your account?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. All your data will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          {/* Chat mute time demo */}
          <Card>
            <CardHeader>
              <CardTitle>Mute notifications (Zalo-style) — realtime demo</CardTitle>
              <CardDescription>
                Local state + setTimeout auto-unmute + countdown UI (không backend/socket)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MuteChatListDemo />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pinned / Normal / Muted grouping — demo</CardTitle>
              <CardDescription>
                Quy tắc ưu tiên: muted luôn thắng pinned. Auto-unmute realtime.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PinnedMutedChatListDemo />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Group task with subtasks — realtime demo</CardTitle>
              <CardDescription>
                1 task chung + nhiều subtask giao từng người + nhắc hạn mention đúng phần việc chưa xong (local state)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SubtaskGroupTaskDemo />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ComponentsDemoPage;
