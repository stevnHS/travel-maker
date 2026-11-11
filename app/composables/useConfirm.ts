import ConfirmDialog from '~/components/ConfirmDialog.vue'

/** 以對話框詢問使用者，確認回傳 true，取消或關閉回傳 false */
export function useConfirm() {
  const modal = useOverlay().create(ConfirmDialog)

  return async (props: InstanceType<typeof ConfirmDialog>['$props']) => {
    const result = await modal.open(props)
    return result === true
  }
}
