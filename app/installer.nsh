; Custom NSIS hooks cho min-clip installer
; Xử lý: ELECTRON_RUN_AS_NODE=1 trong User env sẽ bắt electron chạy như Node thường
; → app crash khi mở. Fix bằng cách xoá env var này cho cả User và System khi cài.

!macro customInstall
  ; Bỏ qua nếu không phải Windows Vista+ (NSIS 3+ yêu cầu UAC)
  ${If} ${RunningX64}
    SetRegView 64
  ${EndIf}

  ; Xoá ELECTRON_RUN_AS_NODE ở User level (HKCU)
  WriteRegExpandStr HKCU "Environment" "ELECTRON_RUN_AS_NODE" ""

  ; Cũng xoá ở System level (HKLM) nếu có
  DeleteRegValue HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "ELECTRON_RUN_AS_NODE"

  ; Broadcast WM_SETTINGCHANGE để các process đang chạy nhận update
  System::Call 'user32::SendMessageTimeoutW(i 0xffff, i 0x1A, i 0, w "Environment", i 0, i 1000, i 0) i .r0'
!macroend

!macro customUnInstall
  ; Không cần xoá lại khi uninstall - để nguyên nếu user muốn dùng env var cho mục đích khác
!macroend