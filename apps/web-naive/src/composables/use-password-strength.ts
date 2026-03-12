import { computed, ref, watch } from 'vue';
import { getSecurityConfigApi } from '#/api';

/**
 * 密码强度等级
 */
export type PasswordStrengthLevel = 'weak' | 'medium' | 'good' | 'strong';

/**
 * 密码强度信息
 */
export interface PasswordStrengthInfo {
  /** 强度分数 (0-100) */
  score: number;
  /** 强度等级 */
  level: PasswordStrengthLevel;
  /** 强度文本 */
  text: string;
  /** 强度颜色 */
  color: string;
  /** 验证提示 */
  tips: string[];
}

/**
 * 密码强度计算 Composable
 * 提供密码强度计算和验证提示功能
 */
export function usePasswordStrength(password: string | (() => string)) {
  const passwordValue = ref(typeof password === 'string' ? password : password());
  const policy = ref<any>(null);

  // 加载系统安全策略
  async function loadPolicy() {
    try {
      policy.value = await getSecurityConfigApi();
    } catch (error) {
      // 忽略错误，使用默认逻辑
    }
  }

  loadPolicy();
  
  // 如果传入的是函数，监听其返回值
  if (typeof password === 'function') {
    watch(password, (newVal) => {
      passwordValue.value = newVal;
    });
  }

  /**
   * 计算密码强度分数 (0-100)
   */
  const score = computed(() => {
    const pwd = passwordValue.value;
    if (!pwd || typeof pwd !== 'string') return 0;

    let strength = 0;

    // 长度得分（最多30分）
    const minLen = policy.value?.passwordMinLength || 8;
    if (pwd.length >= minLen) strength += 10;
    if (pwd.length >= minLen + 4) strength += 10;
    if (pwd.length >= minLen + 8) strength += 10;

    // 复杂度得分（每种字符类型10分）
    if (/[A-Z]/.test(pwd)) strength += 10;
    if (/[a-z]/.test(pwd)) strength += 10;
    if (/[0-9]/.test(pwd)) strength += 10;
    if (/[^A-Za-z0-9]/.test(pwd)) strength += 10;

    // 多样性得分（最多30分）
    const uniqueChars = new Set(pwd).size;
    if (uniqueChars >= 8) strength += 10;
    if (uniqueChars >= 12) strength += 10;
    if (uniqueChars >= 16) strength += 10;

    return Math.min(strength, 100);
  });

  /**
   * 密码强度等级
   */
  const level = computed((): PasswordStrengthLevel => {
    const s = score.value;
    if (s < 40) return 'weak';
    if (s < 60) return 'medium';
    if (s < 80) return 'good';
    return 'strong';
  });

  /**
   * 强度文本
   */
  const text = computed(() => {
    const levelMap = {
      weak: '弱',
      medium: '中',
      good: '强',
      strong: '很强',
    };
    return levelMap[level.value];
  });

  /**
   * 强度颜色
   */
  const color = computed(() => {
    const colorMap = {
      weak: '#f5222d',
      medium: '#fa8c16',
      good: '#52c41a',
      strong: '#1890ff',
    };
    return colorMap[level.value];
  });

  /**
   * 验证提示
   */
  const tips = computed(() => {
    const pwd = passwordValue.value;
    const tipsList: string[] = [];

    if (!pwd || typeof pwd !== 'string') {
      return ['请输入密码'];
    }

    const p = policy.value;

    // 长度检查
    const minLen = p?.passwordMinLength || 8;
    const maxLen = p?.passwordMaxLength || 32;

    if (pwd.length < minLen) {
      tipsList.push(`密码长度至少${minLen}个字符`);
    } else if (pwd.length > maxLen) {
      tipsList.push(`密码长度不能超过${maxLen}个字符`);
    }

    // 复杂度检查
    if ((p?.passwordRequireUppercase ?? true) && !/[A-Z]/.test(pwd)) {
      tipsList.push('必须包含大写字母');
    }
    if ((p?.passwordRequireLowercase ?? true) && !/[a-z]/.test(pwd)) {
      tipsList.push('必须包含小写字母');
    }
    if ((p?.passwordRequireNumber ?? true) && !/[0-9]/.test(pwd)) {
      tipsList.push('必须包含数字');
    }
    if (p?.passwordRequireSpecial && !/[^A-Za-z0-9]/.test(pwd)) {
      tipsList.push('必须包含特殊字符');
    }

    if (tipsList.length === 0) {
      tipsList.push('密码强度良好');
    }

    return tipsList;
  });

  /**
   * 完整的密码强度信息
   */
  const strengthInfo = computed((): PasswordStrengthInfo => ({
    score: score.value,
    level: level.value,
    text: text.value,
    color: color.value,
    tips: tips.value,
  }));

  return {
    score,
    level,
    text,
    color,
    tips,
    strengthInfo,
  };
}
