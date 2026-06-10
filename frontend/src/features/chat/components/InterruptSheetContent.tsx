import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import { Zap, ClipboardEdit, Check } from 'lucide-react-native';
import { AprvLineEditorPanel } from '../../../shared/components/AprvLineEditorPanel';
import { useTheme } from '../../../shared/hooks/useTheme';
import type { FormField } from '../types';
import type { AprvEntry } from '../../leave-req/api';
import { Text } from '../../../shared/components/ui/text';
import { Input, InputField } from '../../../shared/components/ui/input';
import { Textarea, TextareaInput } from '../../../shared/components/ui/textarea';

const TEXTAREA_MIN = 88;
const TEXTAREA_MAX = 220;

function FormFieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}) {
  const theme = useTheme();
  const inputRef = useRef<any>(null);
  const [nativeHeight, setNativeHeight] = useState(TEXTAREA_MIN);

  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || field.type !== 'textarea') return;
    const el = inputRef.current as any;
    if (!el?.style) return;
    el.style.height = 'auto';
    const h = Math.max(TEXTAREA_MIN, Math.min(el.scrollHeight, TEXTAREA_MAX));
    el.style.height = `${h}px`;
  }, [value, field.type]);

  if (field.type === 'textarea') {
    return (
      <Textarea
        className="w-full bg-background-50 border border-outline-200 rounded-lg"
        style={Platform.OS === 'web' ? ({ minHeight: TEXTAREA_MIN, maxHeight: TEXTAREA_MAX, resize: 'none' } as any) : { height: nativeHeight }}
      >
        <TextareaInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          placeholder={field.placeholder ?? '내용을 입력하세요'}
          placeholderTextColor={theme.text.subtle}
          multiline
          onContentSizeChange={
            Platform.OS !== 'web'
              ? (e) =>
                  setNativeHeight(
                    Math.max(TEXTAREA_MIN, Math.min(e.nativeEvent.contentSize.height, TEXTAREA_MAX)),
                  )
              : undefined
          }
          className="text-[13px] leading-5 text-typography-900"
        />
      </Textarea>
    );
  }

  if (field.type === 'select' && field.options) {
    return (
      <View className="flex-row gap-2 flex-wrap">
        {field.options.map((opt) => {
          const selected = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              className={`flex-row items-center border rounded-lg px-3 py-2 ${selected ? 'border-primary-500 bg-primary-50' : 'border-outline-200 bg-transparent'}`}
              activeOpacity={0.7}
            >
              {selected && <Check size={12} color={theme.brand.primary} strokeWidth={3} className="mr-1" />}
              <Text className={`text-[13px] ${selected ? 'text-primary-600 font-semibold' : 'text-typography-800'}`}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <Input className="w-full bg-background-50 border border-outline-200 rounded-lg h-[40px]">
      <InputField
        value={value}
        onChangeText={onChange}
        placeholder={field.placeholder ?? '내용을 입력하세요'}
        placeholderTextColor={theme.text.subtle}
        className="text-[13px] text-typography-900"
      />
    </Input>
  );
}

interface Props {
  interruptType: 'excu' | 'form';
  previewText?: string;
  formTitle?: string;
  formFields?: FormField[] | null;
  aprvlList?: AprvEntry[] | null;
  refList?: AprvEntry[];
  currentUserId?: string;
  onApprove: (resumeValue: string, displayText?: string) => void;
  onCancel: () => void;
}

export function InterruptSheetContent({
  interruptType,
  previewText,
  formTitle,
  formFields,
  aprvlList,
  refList: refListProp = [],
  currentUserId,
  onApprove,
  onCancel,
}: Props) {
  const theme = useTheme();

  const [aprvList, setAprvList]   = useState<AprvEntry[]>(aprvlList ?? []);
  const [refList, setRefList]     = useState<AprvEntry[]>(refListProp);
  const [deptRefYn, setDeptRefYn] = useState(false);

  const buildInitialValues = (fields: typeof formFields) => {
    const init: Record<string, string> = {};
    fields?.forEach((f) => {
      if (f.value !== undefined) {
        init[f.key] = f.value;
      } else if (f.type === 'select' && f.options?.[0]) {
        init[f.key] = f.options[0].value;
      }
    });
    return init;
  };
  const [formValues, setFormValues] = useState<Record<string, string>>(
    () => buildInitialValues(formFields),
  );

  useEffect(() => {
    setAprvList(aprvlList ?? []);
    setRefList(refListProp);
    setDeptRefYn(false);
    setFormValues(buildInitialValues(formFields));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interruptType, formFields]);

  const hasAprvl = aprvlList !== null && aprvlList !== undefined;
  const isForm   = interruptType === 'form';
  const title    = isForm ? (formTitle ?? '양식 작성') : '실행 확인';
  const Icon     = isForm ? ClipboardEdit : Zap;

  const missingRequired = useMemo(() => {
    if (!isForm || !formFields) return [];
    return formFields
      .filter((f) => f.required && !formValues[f.key]?.trim())
      .map((f) => f.label);
  }, [isForm, formFields, formValues]);

  const handleApprove = () => {
    if (isForm) {
      if (missingRequired.length > 0) return;
      onApprove(JSON.stringify({ decision: '승인', form_data: formValues }), '제출');
    } else if (hasAprvl) {
      onApprove(
        JSON.stringify({
          decision:   '승인',
          aprvl_list: aprvList.map((a) => ({ aprvUserId: a.aprvUserId })),
          ref_list:   refList.map((r) => r.aprvUserId),
        }),
        '승인',
      );
    } else {
      onApprove('승인');
    }
  };

  return (
    <View className="flex-1 flex-col bg-background-0">
      {/* ── 헤더 ── */}
      <View className="flex-row items-center gap-2.5 px-4 py-3.5 border-b border-outline-100">
        <View className="w-7 h-7 rounded-lg items-center justify-center bg-primary-50">
          <Icon size={14} color={theme.brand.primary} />
        </View>
        <Text className="text-[15px] font-semibold text-typography-900">{title}</Text>
      </View>

      {/* ── 바디 (스크롤) ── */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* excu: preview 텍스트 */}
        {!isForm && previewText ? (
          <View className="rounded-xl p-3.5 bg-background-50">
            <Text className="text-[14px] leading-[22px] text-typography-800">{previewText}</Text>
          </View>
        ) : null}

        {/* excu: 결재선 편집 */}
        {!isForm && hasAprvl ? (
          <View className="mt-0.5">
            <AprvLineEditorPanel
              aprvList={aprvList}
              refList={refList}
              deptRefYn={deptRefYn}
              currentUserId={currentUserId}
              onAprvListChange={setAprvList}
              onRefListChange={setRefList}
              onDeptRefToggle={setDeptRefYn}
              theme={theme}
            />
          </View>
        ) : null}

        {/* form: 부제목 */}
        {isForm && previewText ? (
          <Text className="text-[12px] leading-[18px] text-typography-400">{previewText}</Text>
        ) : null}

        {/* form: 동적 필드 */}
        {isForm &&
          formFields?.map((field) => (
            <View key={field.key} className="gap-1.5">
              <Text className="text-[13px] font-medium text-typography-800">
                {field.label}
                {field.required ? (
                  <Text className="text-red-500"> *</Text>
                ) : null}
              </Text>
              <FormFieldInput
                field={field}
                value={formValues[field.key] ?? ''}
                onChange={(v) => setFormValues((prev) => ({ ...prev, [field.key]: v }))}
              />
            </View>
          ))}
      </ScrollView>

      {/* ── 푸터 ── */}
      <View className="p-4 pt-3 gap-2 border-t border-outline-100">
        {/* 필수 미입력 안내 */}
        {isForm && missingRequired.length > 0 && (
          <Text className="text-[12px] leading-[18px] text-red-500">
            필수 항목을 입력해주세요: {missingRequired.join(', ')}
          </Text>
        )}
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 h-[42px] border border-outline-200 rounded-xl items-center justify-center"
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text className="text-[14px] font-semibold text-typography-700">취소</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-[2] h-[42px] rounded-xl items-center justify-center ${isForm && missingRequired.length > 0 ? 'bg-outline-200' : 'bg-primary-500'}`}
            onPress={handleApprove}
            activeOpacity={isForm && missingRequired.length > 0 ? 1 : 0.8}
            disabled={isForm && missingRequired.length > 0}
          >
            <Text className="text-[14px] font-semibold text-white">
              {isForm ? '저장하기' : '실행 확인'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
