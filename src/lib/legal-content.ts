import type { Locale } from '@/i18n/config';

type LegalSection = {
  title: string;
  paragraphs: string[];
};

type LegalDocument = {
  title: string;
  description: string;
  lastUpdatedLabel: string;
  effectiveDate: string;
  sections: LegalSection[];
};

const termsEn: LegalDocument = {
  title: 'Terms & Conditions',
  description:
    'These Terms & Conditions explain the rules for using Localisio, publishing events and groups, and interacting with other members of the community.',
  lastUpdatedLabel: 'Last updated',
  effectiveDate: 'March 13, 2026',
  sections: [
    {
      title: '1. Acceptance of terms',
      paragraphs: [
        'By creating an account or using Localisio, you agree to these Terms & Conditions and to our Privacy Policy.',
        'If you do not agree with these terms, you should not use the platform.',
      ],
    },
    {
      title: '2. Eligibility and accounts',
      paragraphs: [
        'You are responsible for keeping your account credentials secure and for the activity that happens under your account.',
        'You agree to provide accurate information and to keep your profile details reasonably up to date.',
      ],
    },
    {
      title: '3. Events, groups, and user content',
      paragraphs: [
        'You may publish events, groups, comments, messages, and other content only if you have the right to do so and if the content is lawful.',
        'You must not publish misleading, abusive, hateful, fraudulent, sexual, violent, or otherwise harmful content.',
      ],
    },
    {
      title: '4. Community conduct',
      paragraphs: [
        'You agree to treat other users respectfully and not to harass, threaten, impersonate, spam, or misuse the platform.',
        'We may remove content or restrict accounts, groups, or events that violate these rules or create risk for the community.',
      ],
    },
    {
      title: '5. Moderation and enforcement',
      paragraphs: [
        'Localisio may review reports, block or remove content, suspend accounts, or limit access to features when necessary for safety, legal compliance, or platform integrity.',
        'Organizers and moderators are responsible for managing their communities and events in a lawful and fair way.',
      ],
    },
    {
      title: '6. No guarantee of attendance or availability',
      paragraphs: [
        'We do not guarantee that any event, group, message, or user interaction will be available, accurate, or safe at all times.',
        'Participation in offline events is at your own risk, and users remain personally responsible for their decisions and behavior.',
      ],
    },
    {
      title: '7. Intellectual property',
      paragraphs: [
        'You keep ownership of the content you submit, but you grant Localisio a non-exclusive right to host, display, and process that content for operating the platform.',
        'You must not upload content that infringes another person’s intellectual property or privacy rights.',
      ],
    },
    {
      title: '8. Limitation of liability',
      paragraphs: [
        'To the maximum extent permitted by law, Localisio is provided on an "as is" and "as available" basis without warranties of uninterrupted service.',
        'We are not liable for indirect, incidental, special, or consequential damages resulting from your use of the platform or attendance at community events.',
      ],
    },
    {
      title: '9. Changes to these terms',
      paragraphs: [
        'We may update these Terms & Conditions from time to time. Continued use of Localisio after updates means you accept the revised terms.',
      ],
    },
    {
      title: '10. Contact',
      paragraphs: [
        'If you have questions about these terms, contact the Localisio team through the contact details available on the platform.',
      ],
    },
  ],
};

const termsRu: LegalDocument = {
  title: 'Условия использования',
  description:
    'Эти условия использования описывают правила работы с Localisio, публикации мероприятий и групп, а также взаимодействия с другими участниками сообщества.',
  lastUpdatedLabel: 'Последнее обновление',
  effectiveDate: '13 марта 2026',
  sections: [
    {
      title: '1. Принятие условий',
      paragraphs: [
        'Создавая аккаунт или используя Localisio, вы соглашаетесь с этими условиями использования и с нашей Политикой конфиденциальности.',
        'Если вы не согласны с этими условиями, пожалуйста, не используйте платформу.',
      ],
    },
    {
      title: '2. Аккаунт и ответственность',
      paragraphs: [
        'Вы несёте ответственность за сохранность данных для входа и за все действия, совершённые через ваш аккаунт.',
        'Вы обязуетесь указывать корректную информацию и при необходимости обновлять данные профиля.',
      ],
    },
    {
      title: '3. Мероприятия, группы и пользовательский контент',
      paragraphs: [
        'Вы можете публиковать мероприятия, группы, комментарии, сообщения и другой контент только если имеете на это право и такой контент не нарушает закон.',
        'Запрещено публиковать вводящий в заблуждение, оскорбительный, дискриминационный, мошеннический, сексуализированный, насильственный или иной вредоносный контент.',
      ],
    },
    {
      title: '4. Правила поведения в сообществе',
      paragraphs: [
        'Вы обязуетесь уважительно относиться к другим пользователям и не использовать платформу для травли, угроз, спама, преследования, подделки личности или иных злоупотреблений.',
        'Мы можем удалять контент или ограничивать доступ к аккаунтам, группам и мероприятиям, если они нарушают правила или создают риск для сообщества.',
      ],
    },
    {
      title: '5. Модерация и меры воздействия',
      paragraphs: [
        'Localisio вправе рассматривать жалобы, ограничивать аккаунты, блокировать контент, группы и мероприятия, а также ограничивать функции платформы в целях безопасности, соблюдения закона и защиты сообщества.',
        'Организаторы и модераторы несут ответственность за законное и добросовестное управление своими группами и мероприятиями.',
      ],
    },
    {
      title: '6. Отсутствие гарантий',
      paragraphs: [
        'Мы не гарантируем, что любое мероприятие, группа, сообщение или взаимодействие будут доступны, точны или безопасны в любой момент времени.',
        'Участие в офлайн-мероприятиях осуществляется на ваш собственный риск, и пользователи лично отвечают за свои решения и поведение.',
      ],
    },
    {
      title: '7. Права на контент',
      paragraphs: [
        'Вы сохраняете права на размещённый вами контент, но предоставляете Localisio неисключительное право хранить, отображать и обрабатывать его для работы платформы.',
        'Нельзя загружать контент, который нарушает авторские права, право на частную жизнь или иные права третьих лиц.',
      ],
    },
    {
      title: '8. Ограничение ответственности',
      paragraphs: [
        'В максимально допустимой законом степени Localisio предоставляется по принципу "как есть" и "по мере доступности", без гарантий бесперебойной работы.',
        'Мы не несем ответственности за косвенные, случайные, специальные или последующие убытки, связанные с использованием платформы или участием в мероприятиях.',
      ],
    },
    {
      title: '9. Изменения условий',
      paragraphs: [
        'Мы можем время от времени обновлять эти условия. Продолжение использования Localisio после публикации изменений означает согласие с новой редакцией.',
      ],
    },
    {
      title: '10. Контакты',
      paragraphs: [
        'Если у вас есть вопросы по этим условиям, свяжитесь с командой Localisio через контактные данные, указанные на платформе.',
      ],
    },
  ],
};

const privacyEn: LegalDocument = {
  title: 'Privacy Policy',
  description:
    'This Privacy Policy explains what data Localisio collects, how we use it, and what rights you have in relation to your personal information.',
  lastUpdatedLabel: 'Last updated',
  effectiveDate: 'March 13, 2026',
  sections: [
    {
      title: '1. Information we collect',
      paragraphs: [
        'We may collect information you provide directly, including your name, email address, profile details, languages, city, messages, event and group content, and uploaded media.',
        'We may also collect technical and usage data necessary to operate, secure, and improve the platform.',
      ],
    },
    {
      title: '2. How we use your data',
      paragraphs: [
        'We use your data to create and manage your account, show relevant events and groups, enable communication between users, moderate the platform, and improve reliability and safety.',
        'We may also use limited data for analytics, abuse prevention, support, and legal compliance.',
      ],
    },
    {
      title: '3. Legal basis and consent',
      paragraphs: [
        'Where required by applicable law, we process personal data based on contract performance, legitimate interests, legal obligations, or your consent.',
        'When consent is required, you may withdraw it, but this may affect your ability to use certain features.',
      ],
    },
    {
      title: '4. Sharing of information',
      paragraphs: [
        'We do not sell your personal data. We may share data with service providers that support hosting, authentication, storage, analytics, or security.',
        'We may also disclose information if required by law or when necessary to protect users, the platform, or our legal rights.',
      ],
    },
    {
      title: '5. Public and private content',
      paragraphs: [
        'Some profile details, events, groups, and other content may be visible to other users depending on your privacy settings and the nature of the feature.',
        'Please avoid sharing sensitive information in content that may become public or visible to other members.',
      ],
    },
    {
      title: '6. Data retention',
      paragraphs: [
        'We keep personal data only as long as necessary for the purposes described in this policy, for platform integrity, dispute resolution, and legal obligations.',
      ],
    },
    {
      title: '7. Security',
      paragraphs: [
        'We use reasonable technical and organizational measures to protect personal data, but no method of storage or transmission can be guaranteed to be fully secure.',
      ],
    },
    {
      title: '8. Your rights',
      paragraphs: [
        'Depending on your location, you may have rights to access, correct, delete, restrict, or object to the processing of your personal data.',
        'You may also be able to request a copy of your data or close your account, subject to technical and legal limitations.',
      ],
    },
    {
      title: '9. Changes to this policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time. Continued use of Localisio after changes means the updated policy applies.',
      ],
    },
    {
      title: '10. Contact',
      paragraphs: [
        'If you have questions about privacy or your personal data, contact the Localisio team through the contact details available on the platform.',
      ],
    },
  ],
};

const privacyRu: LegalDocument = {
  title: 'Политика конфиденциальности',
  description:
    'Эта политика конфиденциальности объясняет, какие данные собирает Localisio, как они используются и какие права у вас есть в отношении персональной информации.',
  lastUpdatedLabel: 'Последнее обновление',
  effectiveDate: '13 марта 2026',
  sections: [
    {
      title: '1. Какие данные мы собираем',
      paragraphs: [
        'Мы можем собирать данные, которые вы предоставляете напрямую: имя, email, сведения профиля, языки, город, сообщения, контент мероприятий и групп, а также загруженные медиафайлы.',
        'Также мы можем собирать технические и поведенческие данные, необходимые для работы, защиты и улучшения платформы.',
      ],
    },
    {
      title: '2. Как мы используем данные',
      paragraphs: [
        'Мы используем данные для создания и обслуживания аккаунта, показа релевантных событий и групп, общения между пользователями, модерации платформы, а также повышения надёжности и безопасности.',
        'Ограниченный набор данных может использоваться для аналитики, предотвращения злоупотреблений, поддержки и соблюдения закона.',
      ],
    },
    {
      title: '3. Правовые основания и согласие',
      paragraphs: [
        'Если это требуется применимым законодательством, мы обрабатываем персональные данные на основании исполнения договора, законных интересов, юридических обязательств или вашего согласия.',
        'Если обработка основана на согласии, вы можете его отозвать, но это может повлиять на доступность отдельных функций.',
      ],
    },
    {
      title: '4. Передача данных третьим лицам',
      paragraphs: [
        'Мы не продаём персональные данные. Мы можем передавать информацию поставщикам сервисов, которые обеспечивают хостинг, аутентификацию, хранение, аналитику и безопасность.',
        'Мы также можем раскрывать данные, если этого требует закон или если это необходимо для защиты пользователей, платформы или наших прав.',
      ],
    },
    {
      title: '5. Публичный и приватный контент',
      paragraphs: [
        'Некоторые данные профиля, события, группы и другой контент могут быть видны другим пользователям в зависимости от ваших настроек приватности и характера функции.',
        'Пожалуйста, не публикуйте чувствительную информацию в контенте, который может стать публичным или доступным другим участникам.',
      ],
    },
    {
      title: '6. Срок хранения данных',
      paragraphs: [
        'Мы храним персональные данные только столько, сколько необходимо для целей, описанных в этой политике, а также для защиты платформы, разрешения споров и соблюдения юридических обязательств.',
      ],
    },
    {
      title: '7. Безопасность',
      paragraphs: [
        'Мы применяем разумные технические и организационные меры защиты персональных данных, однако ни один способ хранения или передачи данных не может считаться абсолютно безопасным.',
      ],
    },
    {
      title: '8. Ваши права',
      paragraphs: [
        'В зависимости от вашей юрисдикции вы можете иметь право запросить доступ, исправление, удаление, ограничение обработки или возражение против обработки персональных данных.',
        'Вы также можете запросить копию своих данных или закрытие аккаунта с учётом технических и юридических ограничений.',
      ],
    },
    {
      title: '9. Изменения политики',
      paragraphs: [
        'Мы можем время от времени обновлять эту Политику конфиденциальности. Продолжение использования Localisio после изменений означает применение обновлённой версии.',
      ],
    },
    {
      title: '10. Контакты',
      paragraphs: [
        'Если у вас есть вопросы о конфиденциальности или обработке ваших персональных данных, свяжитесь с командой Localisio через контактные данные, доступные на платформе.',
      ],
    },
  ],
};

export function getTermsContent(locale: Locale): LegalDocument {
  return locale === 'ru' ? termsRu : termsEn;
}

export function getPrivacyContent(locale: Locale): LegalDocument {
  return locale === 'ru' ? privacyRu : privacyEn;
}
