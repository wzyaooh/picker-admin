from app.models.base import BaseModel


class EnrichedResult(BaseModel):
    """LLM 增强后的爬取结果"""

    COLLECTION = 'enriched_result'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.result_id = kwargs.get('result_id', '')
        self.task_id = kwargs.get('task_id', '')
        self.title = kwargs.get('title', '')
        self.summary = kwargs.get('summary', '')
        self.one_liner_for_humans = kwargs.get('one_liner_for_humans', '')
        self.category = kwargs.get('category', '')
        self.tags = kwargs.get('tags', [])
        self.highlights = kwargs.get('highlights', [])
        self.use_cases = kwargs.get('use_cases', [])
        self.pros = kwargs.get('pros', [])
        self.cons = kwargs.get('cons', [])
        self.similar_projects = kwargs.get('similar_projects', [])
        self.inspired_by = kwargs.get('inspired_by', [])
        self.difficulty_level = kwargs.get('difficulty_level', '')
        self.recommendation = kwargs.get('recommendation', '')
        self.beginner_guide = kwargs.get('beginner_guide', {})
        self.developer_guide = kwargs.get('developer_guide', {})
        self.deploy_methods = kwargs.get('deploy_methods', [])
        self.deploy_steps = kwargs.get('deploy_steps', [])
        self.system_requirements = kwargs.get('system_requirements', '')
        self.tech_stack = kwargs.get('tech_stack', [])
        self.architecture = kwargs.get('architecture', '')
        self.data_sources = kwargs.get('data_sources', [])
        self.web_references = kwargs.get('web_references', [])
        self.extension_ideas = kwargs.get('extension_ideas', [])
        self.project_ideas = kwargs.get('project_ideas', [])
        self.insights = kwargs.get('insights', '')
        self.learning_resources = kwargs.get('learning_resources', [])
        self.community_health = kwargs.get('community_health', {})
        self.security_considerations = kwargs.get('security_considerations', [])
        self.migration_guide = kwargs.get('migration_guide', {})
        self.code_quality_score = kwargs.get('code_quality_score', {})
        self.best_practices = kwargs.get('best_practices', [])
        self.quick_start_code = kwargs.get('quick_start_code', '')
        self.generated_article = kwargs.get('generated_article', '')
        self.generated_tutorial = kwargs.get('generated_tutorial', '')
        self.maturity_level = kwargs.get('maturity_level', '')
        self.project_type = kwargs.get('project_type', '')
        self.detected_language = kwargs.get('detected_language', '')
        self.type_specific = kwargs.get('type_specific', {})
        self.project_structure_analysis = kwargs.get('project_structure_analysis', {})
        self.raw_llm_response = kwargs.get('raw_llm_response', '')
        self.model = kwargs.get('model', '')
        self.tokens_used = kwargs.get('tokens_used', 0)
        self.status = kwargs.get('status', 'pending')
        self.error_msg = kwargs.get('error_msg')

    def _fields(self) -> dict:
        return {
            'result_id': self.result_id,
            'task_id': self.task_id,
            'title': self.title,
            'summary': self.summary,
            'one_liner_for_humans': self.one_liner_for_humans,
            'category': self.category,
            'tags': self.tags,
            'highlights': self.highlights,
            'use_cases': self.use_cases,
            'pros': self.pros,
            'cons': self.cons,
            'similar_projects': self.similar_projects,
            'inspired_by': self.inspired_by,
            'difficulty_level': self.difficulty_level,
            'recommendation': self.recommendation,
            'beginner_guide': self.beginner_guide,
            'developer_guide': self.developer_guide,
            'deploy_methods': self.deploy_methods,
            'deploy_steps': self.deploy_steps,
            'system_requirements': self.system_requirements,
            'tech_stack': self.tech_stack,
            'architecture': self.architecture,
            'data_sources': self.data_sources,
            'web_references': self.web_references,
            'extension_ideas': self.extension_ideas,
            'project_ideas': self.project_ideas,
            'insights': self.insights,
            'learning_resources': self.learning_resources,
            'community_health': self.community_health,
            'security_considerations': self.security_considerations,
            'migration_guide': self.migration_guide,
            'code_quality_score': self.code_quality_score,
            'best_practices': self.best_practices,
            'quick_start_code': self.quick_start_code,
            'generated_article': self.generated_article,
            'generated_tutorial': self.generated_tutorial,
            'maturity_level': self.maturity_level,
            'project_type': self.project_type,
            'detected_language': self.detected_language,
            'type_specific': self.type_specific,
            'project_structure_analysis': self.project_structure_analysis,
            'raw_llm_response': self.raw_llm_response,
            'model': self.model,
            'tokens_used': self.tokens_used,
            'status': self.status,
            'error_msg': self.error_msg,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }

    @classmethod
    def find_by_result_id(cls, result_id: str):
        doc = cls._col().find_one({'result_id': result_id})
        return cls(**doc) if doc else None

    @classmethod
    def find_by_task(cls, task_id: str, page: int = 1, page_size: int = 20):
        return cls.find_paginated({'task_id': task_id}, page, page_size)

    @classmethod
    def delete_by_task(cls, task_id: str):
        cls.delete_many({'task_id': task_id})

    @classmethod
    def get_status_map(cls, task_id: str) -> dict[str, str]:
        """返回 {result_id: status} 映射，用于列表页快速展示增强状态"""
        cursor = cls._col().find(
            {'task_id': task_id},
            {'result_id': 1, 'status': 1},
        )
        return {doc['result_id']: doc['status'] for doc in cursor}

    def to_dict(self):
        return {
            'id': self.id,
            'resultId': self.result_id,
            'taskId': self.task_id,
            'title': self.title,
            'summary': self.summary,
            'oneLinerForHumans': self.one_liner_for_humans,
            'category': self.category,
            'tags': self.tags,
            'highlights': self.highlights,
            'useCases': self.use_cases,
            'pros': self.pros,
            'cons': self.cons,
            'similarProjects': self.similar_projects,
            'inspiredBy': self.inspired_by,
            'difficultyLevel': self.difficulty_level,
            'recommendation': self.recommendation,
            'beginnerGuide': self.beginner_guide,
            'developerGuide': self.developer_guide,
            'deployMethods': self.deploy_methods,
            'deploySteps': self.deploy_steps,
            'systemRequirements': self.system_requirements,
            'techStack': self.tech_stack,
            'architecture': self.architecture,
            'dataSources': self.data_sources,
            'webReferences': self.web_references,
            'extensionIdeas': self.extension_ideas,
            'projectIdeas': self.project_ideas,
            'insights': self.insights,
            'learningResources': self.learning_resources,
            'communityHealth': self.community_health,
            'securityConsiderations': self.security_considerations,
            'migrationGuide': self.migration_guide,
            'codeQualityScore': self.code_quality_score,
            'bestPractices': self.best_practices,
            'quickStartCode': self.quick_start_code,
            'generatedArticle': self.generated_article,
            'generatedTutorial': self.generated_tutorial,
            'maturityLevel': self.maturity_level,
            'projectType': self.project_type,
            'detectedLanguage': self.detected_language,
            'typeSpecific': self.type_specific,
            'projectStructureAnalysis': self.project_structure_analysis,
            'model': self.model,
            'tokensUsed': self.tokens_used,
            'status': self.status,
            'errorMsg': self.error_msg,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }
